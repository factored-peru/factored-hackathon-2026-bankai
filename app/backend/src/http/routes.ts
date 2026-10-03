import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { type Env, env } from "../config/env.js";
import {
	approvalDecisionSchema,
	type DisputeEvidence,
	escalationRequestSchema,
	type TransactionEvidence,
} from "../domain/disputes/contracts.js";
import { errorCodes } from "../domain/error-codes.js";
import { AppError } from "../domain/errors.js";
import { createItemSchema } from "../domain/items.js";
import type { SessionContext } from "../domain/session.js";
import type { DisputeSupportService } from "../services/disputes/dispute-support-service.js";
import type { ItemService } from "../services/item-service.js";
import type { SessionAuthService } from "../services/session-auth-service.js";
import type { AppIntegrations } from "./server.js";

const openApiSpecUrl = new URL("../../specs/openapi.json", import.meta.url);

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

export function registerRoutes(
	app: FastifyInstance,
	itemService: ItemService,
	runtimeEnv: Env = env,
	integrations?: AppIntegrations,
	disputeRuntime?: DisputeHttpRuntime,
): void {
	app.get("/openapi.json", async () => Bun.file(openApiSpecUrl).json());

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
}
