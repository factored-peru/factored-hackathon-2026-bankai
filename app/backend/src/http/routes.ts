import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { type Env, env } from "../config/env.js";
import {
	attachmentKindSchema,
	type WebsocketServerEvent,
	websocketClientEventSchema,
} from "../domain/conversation/contracts.js";
import {
	approvalDecisionSchema,
	type DisputeEvidence,
	escalationRequestSchema,
	type TransactionEvidence,
} from "../domain/disputes/contracts.js";
import { errorCodes } from "../domain/error-codes.js";
import { AppError } from "../domain/errors.js";
import { createItemSchema } from "../domain/items.js";
import type { SessionContext, SessionStore } from "../domain/session.js";
import type { ConversationService } from "../services/conversations/conversation-service.js";
import type { DisputeSupportService } from "../services/disputes/dispute-support-service.js";
import type { ItemService } from "../services/item-service.js";
import type {
	AttachmentStore,
	ConversationEventPublisher,
	DemoActorDirectory,
} from "../services/ports/conversation.js";
import type { SessionAuthService } from "../services/session-auth-service.js";
import type { AppIntegrations } from "./server.js";

const openApiSpecUrl = new URL("../../specs/openapi.json", import.meta.url);
const asyncApiSpecUrl = new URL("../../specs/asyncapi.json", import.meta.url);

type IntegrationStatus = "disabled" | "ready" | "degraded";

function optionalIntegrationStatus(
	enabled: boolean,
	ready: boolean,
): IntegrationStatus {
	if (!enabled) {
		return "disabled";
	}
	return ready ? "ready" : "degraded";
}

function serviceTokenFromHeader(request: FastifyRequest): string | undefined {
	const header = request.headers.authorization;
	if (header === undefined || !header.startsWith("Bearer ")) {
		return undefined;
	}
	return header.slice("Bearer ".length);
}

function tokensMatch(actual: string, expected: string): boolean {
	const actualBuffer = Buffer.from(actual);
	const expectedBuffer = Buffer.from(expected);
	return (
		actualBuffer.length === expectedBuffer.length &&
		timingSafeEqual(actualBuffer, expectedBuffer)
	);
}

function requireServiceToken(request: FastifyRequest, runtimeEnv: Env): void {
	if (runtimeEnv.SERVICE_TOKEN.length === 0) {
		return;
	}
	const token = serviceTokenFromHeader(request);
	if (token === undefined) {
		throw new AppError(errorCodes.CREDENTIALS_MISSING);
	}
	if (!tokensMatch(token, runtimeEnv.SERVICE_TOKEN)) {
		throw new AppError(errorCodes.CREDENTIALS_INVALID_OR_EXPIRED);
	}
}

export type DisputeHttpRuntime = Readonly<{
	auth: SessionAuthService;
	support: DisputeSupportService;
}>;

export type ConversationHttpRuntime = Readonly<{
	sessions: SessionStore;
	demoActors: DemoActorDirectory;
	demoFixtures: Readonly<{
		transactionId: string;
		disputeId: string;
		caseId: string;
	}>;
	conversations: ConversationService;
	attachments: AttachmentStore;
	demoAttachmentUpload?: {
		upload(input: {
			attachmentId: string;
			session: SessionContext;
			mediaType: string;
			content: Uint8Array;
		}): Promise<unknown | null>;
	};
	publisher: ConversationEventPublisher;
}>;

function cookieValue(
	request: FastifyRequest,
	name: string,
): string | undefined {
	const header = request.headers.cookie;
	if (!header) return undefined;
	for (const item of header.split(";")) {
		const [key, ...value] = item.trim().split("=");
		if (key === name) return value.join("=");
	}
	return undefined;
}

async function requireSession(
	request: FastifyRequest,
	runtime: DisputeHttpRuntime | undefined,
	runtimeEnv: Env,
): Promise<SessionContext> {
	if (!runtime) throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
	const sessionId = cookieValue(request, runtimeEnv.SESSION_COOKIE_NAME);
	if (!sessionId) throw new AppError(errorCodes.CREDENTIALS_MISSING);
	const session = await runtime.auth.resolve(sessionId);
	if (!session) throw new AppError(errorCodes.CREDENTIALS_INVALID_OR_EXPIRED);
	return session;
}

function sendDisputeResult<T>(
	result:
		| Awaited<ReturnType<DisputeSupportService["transaction"]>>
		| Awaited<ReturnType<DisputeSupportService["dispute"]>>
		| Awaited<ReturnType<DisputeSupportService["case"]>>
		| Awaited<ReturnType<DisputeSupportService["requestEscalation"]>>
		| Awaited<ReturnType<DisputeSupportService["decideEscalation"]>>,
): T {
	if (result.status === "ok") return result.value as T;
	if (result.status === "not_found")
		throw new AppError(errorCodes.RESOURCE_STATE_CONFLICT);
	if (result.status === "forbidden")
		throw new AppError(errorCodes.INSUFFICIENT_SCOPE);
	throw new AppError(errorCodes.RESOURCE_STATE_CONFLICT);
}

function requireDisputeRuntime(
	runtime: DisputeHttpRuntime | undefined,
): DisputeHttpRuntime {
	if (!runtime) throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
	return runtime;
}

async function requireConversationSession(
	request: FastifyRequest,
	runtime: ConversationHttpRuntime | undefined,
	runtimeEnv: Env,
): Promise<SessionContext> {
	if (!runtime) throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
	const sessionId = cookieValue(request, runtimeEnv.SESSION_COOKIE_NAME);
	if (!sessionId) throw new AppError(errorCodes.CREDENTIALS_MISSING);
	const session = await runtime.sessions.get(sessionId);
	if (!session) throw new AppError(errorCodes.CREDENTIALS_INVALID_OR_EXPIRED);
	return session;
}

function originAllowed(request: FastifyRequest, runtimeEnv: Env): boolean {
	const origin = request.headers.origin;
	const allowed = runtimeEnv.CORS_ALLOWED_ORIGINS.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	return typeof origin === "string" && allowed.includes(origin);
}

export function registerRoutes(
	app: FastifyInstance,
	itemService: ItemService,
	runtimeEnv: Env = env,
	integrations?: AppIntegrations,
	disputeRuntime?: DisputeHttpRuntime,
	conversationRuntime?: ConversationHttpRuntime,
): void {
	app.get("/openapi.json", async () => Bun.file(openApiSpecUrl).json());
	app.get("/asyncapi.json", async () => Bun.file(asyncApiSpecUrl).json());

	app.get("/v1/health/live", async () => ({
		status: "ok",
		service: runtimeEnv.APP_NAME,
	}));

	app.get("/v1/health/ready", async () => {
		const storeReady = await itemService.isReady();
		const databaseReady =
			runtimeEnv.DATABASE_ENABLED && integrations
				? await integrations.database.isReady()
				: true;
		const bucketReady =
			runtimeEnv.BUCKET_ENABLED && integrations
				? await integrations.bucket.isReady()
				: true;
		const cacheReady =
			runtimeEnv.CACHE_ENABLED && integrations
				? await integrations.cache.isReady()
				: true;
		const sessionReady = runtimeEnv.SESSION_STORE_ENABLED
			? (integrations?.session?.isReady() ?? false)
			: true;
		const ready =
			storeReady && databaseReady && bucketReady && cacheReady && sessionReady;

		return {
			status: ready ? "ok" : "degraded",
			service: runtimeEnv.APP_NAME,
			details: {
				environment: runtimeEnv.APP_ENV,
				storeReady,
				database: optionalIntegrationStatus(
					runtimeEnv.DATABASE_ENABLED,
					databaseReady,
				),
				bucket: optionalIntegrationStatus(
					runtimeEnv.BUCKET_ENABLED,
					bucketReady,
				),
				cache: optionalIntegrationStatus(runtimeEnv.CACHE_ENABLED, cacheReady),
				session: optionalIntegrationStatus(
					runtimeEnv.SESSION_STORE_ENABLED,
					sessionReady,
				),
			},
		};
	});

	app.post("/v1/items", async (request, reply) => {
		requireServiceToken(request, runtimeEnv);
		const input = createItemSchema.parse(request.body);
		const item = await itemService.create(input);
		return reply.code(201).send(item);
	});

	app.get("/v1/items/:itemId", async (request) => {
		requireServiceToken(request, runtimeEnv);
		const params = request.params as { itemId: string };
		return itemService.get(params.itemId);
	});

	app.post("/v1/sessions", async (request, reply) => {
		if (!disputeRuntime) throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
		const token = serviceTokenFromHeader(request);
		if (!token) throw new AppError(errorCodes.CREDENTIALS_MISSING);
		const session = await disputeRuntime.auth.create(token);
		reply.header(
			"Set-Cookie",
			`${runtimeEnv.SESSION_COOKIE_NAME}=${encodeURIComponent(session.sessionId)}; Path=/; HttpOnly; SameSite=Strict`,
		);
		return reply.code(201).send({ status: "created" });
	});

	app.get("/v1/transactions/:transactionId", async (request) => {
		const session = await requireSession(request, disputeRuntime, runtimeEnv);
		const params = request.params as { transactionId: string };
		const evidence = sendDisputeResult<TransactionEvidence>(
			await requireDisputeRuntime(disputeRuntime).support.transaction(
				session,
				params.transactionId,
			),
		);
		const {
			tenantId: _tenantId,
			ownerUserId: _ownerUserId,
			...publicEvidence
		} = evidence;
		return publicEvidence;
	});

	app.get("/v1/disputes/:disputeId", async (request) => {
		const session = await requireSession(request, disputeRuntime, runtimeEnv);
		const params = request.params as { disputeId: string };
		const evidence = sendDisputeResult<DisputeEvidence>(
			await requireDisputeRuntime(disputeRuntime).support.dispute(
				session,
				params.disputeId,
			),
		);
		const {
			tenantId: _tenantId,
			ownerUserId: _ownerUserId,
			...publicEvidence
		} = evidence;
		return publicEvidence;
	});

	app.get("/v1/dispute-cases/:caseId", async (request) => {
		const session = await requireSession(request, disputeRuntime, runtimeEnv);
		const params = request.params as { caseId: string };
		return sendDisputeResult(
			await requireDisputeRuntime(disputeRuntime).support.case(
				session,
				params.caseId,
			),
		);
	});

	app.post("/v1/dispute-cases/:caseId/escalations", async (request) => {
		const session = await requireSession(request, disputeRuntime, runtimeEnv);
		const params = request.params as { caseId: string };
		const body = escalationRequestSchema.parse({
			...(request.body as object),
			caseId: params.caseId,
		});
		return sendDisputeResult(
			await requireDisputeRuntime(disputeRuntime).support.requestEscalation(
				session,
				body,
			),
		);
	});

	app.post("/v1/approvals/:approvalId/decisions", async (request) => {
		const session = await requireSession(request, disputeRuntime, runtimeEnv);
		const params = request.params as { approvalId: string };
		const body = approvalDecisionSchema.parse(request.body);
		return sendDisputeResult(
			await requireDisputeRuntime(disputeRuntime).support.decideEscalation(
				session,
				params.approvalId,
				body,
			),
		);
	});

	app.get("/v1/demo/actors", async () => {
		if (!runtimeEnv.DEMO_AUTH_ENABLED || !conversationRuntime)
			throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
		return conversationRuntime.demoActors.list();
	});

	app.get("/v1/demo/fixtures", async () => {
		if (!runtimeEnv.DEMO_AUTH_ENABLED || !conversationRuntime)
			throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
		return conversationRuntime.demoFixtures;
	});

	app.post("/v1/demo/sessions", async (request, reply) => {
		if (!runtimeEnv.DEMO_AUTH_ENABLED || !conversationRuntime)
			throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
		const body = request.body as { actorId?: unknown };
		if (typeof body?.actorId !== "string")
			throw new AppError(errorCodes.SCHEMA_VALIDATION_FAILED);
		const actor = await conversationRuntime.demoActors.resolve(body.actorId);
		if (!actor) throw new AppError(errorCodes.CREDENTIALS_INVALID_OR_EXPIRED);
		const session = await conversationRuntime.sessions.create({
			...actor,
			scopes: ["dispute:read"],
		});
		reply.header(
			"Set-Cookie",
			`${runtimeEnv.SESSION_COOKIE_NAME}=${encodeURIComponent(session.sessionId)}; Path=/; HttpOnly; SameSite=Strict`,
		);
		return reply
			.code(201)
			.send({ status: "created", role: actor.roles[0] ?? "customer" });
	});

	app.get("/v1/me", async (request) => {
		const session = await requireConversationSession(
			request,
			conversationRuntime,
			runtimeEnv,
		);
		return {
			userId: session.userId,
			tenantId: session.tenantId,
			roles: session.roles,
			capabilities: session.capabilities,
			sessionVersion: session.sessionVersion,
		};
	});

	app.get("/v1/conversations", async (request) => {
		const session = await requireConversationSession(
			request,
			conversationRuntime,
			runtimeEnv,
		);
		return conversationRuntime?.conversations.list(session);
	});

	app.get("/v1/conversations/:threadId", async (request) => {
		const session = await requireConversationSession(
			request,
			conversationRuntime,
			runtimeEnv,
		);
		const threadId = (request.params as { threadId: string }).threadId;
		const snapshot = await conversationRuntime?.conversations.get(
			session,
			threadId,
		);
		if (!snapshot) throw new AppError(errorCodes.RESOURCE_STATE_CONFLICT);
		return snapshot;
	});

	app.post("/v1/uploads", async (request, reply) => {
		const session = await requireConversationSession(
			request,
			conversationRuntime,
			runtimeEnv,
		);
		const body = request.body as {
			kind?: unknown;
			mediaType?: unknown;
			byteSize?: unknown;
			filename?: unknown;
		};
		const kind = attachmentKindSchema.parse(body.kind);
		if (
			typeof body.mediaType !== "string" ||
			typeof body.filename !== "string" ||
			typeof body.byteSize !== "number" ||
			body.byteSize > runtimeEnv.CHAT_MAX_ATTACHMENT_BYTES
		)
			throw new AppError(errorCodes.SCHEMA_VALIDATION_FAILED);
		const result = await conversationRuntime?.attachments.create({
			session,
			kind,
			mediaType: body.mediaType,
			byteSize: body.byteSize,
			filename: body.filename,
		});
		return reply.code(201).send(result);
	});

	app.post("/v1/uploads/:attachmentId/complete", async (request) => {
		const session = await requireConversationSession(
			request,
			conversationRuntime,
			runtimeEnv,
		);
		const attachmentId = (request.params as { attachmentId: string })
			.attachmentId;
		const result = await conversationRuntime?.attachments.complete({
			attachmentId,
			session,
		});
		if (!result) throw new AppError(errorCodes.RESOURCE_STATE_CONFLICT);
		return result;
	});

	app.put("/v1/demo/uploads/:attachmentId", async (request) => {
		const session = await requireConversationSession(
			request,
			conversationRuntime,
			runtimeEnv,
		);
		if (
			!runtimeEnv.DEMO_AUTH_ENABLED ||
			!conversationRuntime?.demoAttachmentUpload
		)
			throw new AppError(errorCodes.DEPENDENCY_UNAVAILABLE);
		const attachmentId = (request.params as { attachmentId: string })
			.attachmentId;
		const content = request.body;
		const mediaType = request.headers["content-type"];
		if (!(content instanceof Uint8Array) || typeof mediaType !== "string")
			throw new AppError(errorCodes.SCHEMA_VALIDATION_FAILED);
		const result = await conversationRuntime.demoAttachmentUpload.upload({
			attachmentId,
			session,
			mediaType,
			content,
		});
		if (!result) throw new AppError(errorCodes.RESOURCE_STATE_CONFLICT);
		return result;
	});

	app.get("/v1/realtime", { websocket: true }, async (socket, request) => {
		if (
			!runtimeEnv.REALTIME_ENABLED ||
			!conversationRuntime ||
			!originAllowed(request, runtimeEnv)
		)
			return socket.close(1008, "unauthorized");
		let session: SessionContext;
		try {
			session = await requireConversationSession(
				request,
				conversationRuntime,
				runtimeEnv,
			);
		} catch {
			return socket.close(1008, "unauthorized");
		}
		const send = (value: WebsocketServerEvent) =>
			socket.send(JSON.stringify(value));
		send({
			type: "session.ready",
			threadId: null,
			traceId: null,
			revision: null,
			payload: { userId: session.userId, roles: session.roles },
		});
		const unsubscribe = conversationRuntime.publisher.subscribe(
			session.tenantId,
			(outbound) => {
				if (outbound.threadId === null) {
					send(outbound);
					return;
				}
				void conversationRuntime.conversations
					.get(session, outbound.threadId)
					.then((snapshot) => {
						if (snapshot) send(outbound);
					});
			},
		);
		socket.on("message", async (raw) => {
			const parsed = websocketClientEventSchema.safeParse(
				JSON.parse(raw.toString()),
			);
			if (!parsed.success)
				return send({
					type: "problem",
					threadId: null,
					traceId: null,
					revision: null,
					payload: { code: "SVC-CORE-1002" },
				});
			if (parsed.data.type === "conversation.subscribe") {
				const snapshot = await conversationRuntime.conversations.get(
					session,
					parsed.data.threadId,
				);
				return send({
					type: "conversation.snapshot",
					threadId: parsed.data.threadId,
					traceId: snapshot?.trace.traceId ?? null,
					revision: snapshot?.revision ?? null,
					payload: snapshot,
				});
			}
			try {
				const snapshot = await conversationRuntime.conversations.send({
					session,
					...(parsed.data.threadId === undefined
						? {}
						: { threadId: parsed.data.threadId }),
					clientMessageId: parsed.data.clientMessageId,
					...(parsed.data.text === undefined ? {} : { text: parsed.data.text }),
					attachmentIds: parsed.data.attachmentIds,
					traceId: request.id,
				});
				send({
					type: "conversation.snapshot",
					threadId: snapshot.threadId,
					traceId: snapshot.trace.traceId,
					revision: snapshot.revision,
					payload: snapshot,
				});
			} catch {
				send({
					type: "problem",
					threadId: parsed.data.threadId ?? null,
					traceId: request.id,
					revision: null,
					payload: { code: "SVC-CORE-4003" },
				});
			}
		});
		socket.on("close", unsubscribe);
	});
}
