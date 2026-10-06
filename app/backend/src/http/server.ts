import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { BigQuery } from "@google-cloud/bigquery";
import apiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { type Env, env, validateRuntimeConfiguration } from "../config/env.js";
import { demoDisputePack } from "../domain/disputes/demo-fixtures.js";
import { BigQueryDemoActorDirectory } from "../integrations/bigquery/bigquery-demo-actor-directory.js";
import {
	createStructuredQueryRuntime,
	createStructuredRag,
} from "../integrations/bigquery/structured-rag-runtime.js";
import { LocalBucket, type ObjectBucket } from "../integrations/bucket.js";
import { CachingSessionStore } from "../integrations/cache/caching-session-store.js";
import { type Cache, LocalCache } from "../integrations/cache.js";
import { type Database, LocalDatabase } from "../integrations/database.js";
import { createControlPlaneConversationRuntime } from "../integrations/evaluation/create-control-plane-conversation-runtime.js";
import { UserProfileBackedActorDirectory } from "../integrations/identity/user-profile-backed-actor-directory.js";
import {
	createKnowledgeGraphRuntime,
	type KnowledgeGraphRuntime,
} from "../integrations/kg/gcs-knowledge-graph-artifact-repository.js";
import { createKgAdminService } from "../integrations/kg/local-kg-admin-store.js";
import { NoopLlmEphemeralCache } from "../integrations/kv/kv-llm-cache.js";
import { InMemoryDemoActorDirectory } from "../integrations/memory/demo-actor-directory.js";
import { InMemoryAttachmentStore } from "../integrations/memory/in-memory-attachment-store.js";
import {
	InMemoryConversationEventPublisher,
	InMemoryConversationStore,
} from "../integrations/memory/in-memory-conversation-store.js";
import {
	InMemoryDisputeEventSink,
	InMemoryDisputeSupportStore,
} from "../integrations/memory/in-memory-dispute-support-store.js";
import { InMemorySessionStore } from "../integrations/memory/in-memory-session-store.js";
import { MemoryItemStore } from "../integrations/memory-item-store.js";
import { createLiveBaselineObserver } from "../integrations/observability/live-baseline-observer-runtime.js";
import {
	createProductiveDataStores,
	type ProductiveDataStores,
} from "../integrations/productive-data-stores.js";
import { createGuardrailProvider } from "../integrations/providers/guardrail-provider-factory.js";
import { HeuristicHitlDecisionSignalProvider } from "../integrations/providers/heuristic-hitl-decision-signal-provider.js";
import { createKnowledgeGraphSelector } from "../integrations/providers/knowledge-graph-selector-runtime.js";
import { SafeInformationalModelProvider } from "../integrations/providers/safe-informational-model-provider.js";
import { createStructuredSelector } from "../integrations/providers/structured-selector-runtime.js";
import { createVertexBaselineChatProvider } from "../integrations/providers/vertex-baseline-chat-provider.js";
import {
	createLlmCacheRuntime,
	createSessionRuntime,
	type LlmCacheRuntime,
	type SessionRuntime,
} from "../integrations/session-runtime.js";
import type { KgAdminService } from "../services/admin/kg-admin-service.js";
import { BaselineConversationRunner } from "../services/baseline/baseline-conversation-runner.js";
import { BaselineQueryTool } from "../services/baseline/baseline-query-tool.js";
import {
	createRagRetrievalRuntime,
	type RagRetrievalRuntime,
	withStructuredRag,
} from "../services/control-plane/rag-retrieval-runtime.js";
import { ConversationService } from "../services/conversations/conversation-service.js";
import { deterministicConversationRunner } from "../services/conversations/deterministic-conversation-runner.js";
import { DisputeSupportService } from "../services/disputes/dispute-support-service.js";
import { ItemService } from "../services/item-service.js";
import type { BaselineRunObserver } from "../services/ports/baseline-chat.js";
import type { DemoActorDirectory } from "../services/ports/conversation.js";
import type { CustomerIdentityResolver } from "../services/ports/customer-identity.js";
import type { LlmEphemeralCache } from "../services/ports/llm-ephemeral-cache.js";
import { SessionAuthService } from "../services/session-auth-service.js";
import { registerErrorHandler } from "./error-handler.js";
import {
	type ConversationHttpRuntime,
	type DisputeHttpRuntime,
	registerRoutes,
} from "./routes.js";

declare module "fastify" {
	interface FastifyInstance {
		/** Local or GCS KG runtime for createRagStateGraph / evals; null when unset. */
		knowledgeGraphRuntime: KnowledgeGraphRuntime | null;
		/** Retrieval StateGraph bound to the KG runtime when available. */
		ragRetrievalRuntime: RagRetrievalRuntime | null;
		/** Backoffice KG current/versions/diff/promote for local publication root. */
		kgAdminService: KgAdminService | null;
		/** Durable Firestore/GCS stores when productive flags are on. */
		productiveDataStores: ReturnType<typeof createProductiveDataStores>;
	}
}

export type AppIntegrations = Readonly<{
	database: Database;
	bucket: ObjectBucket;
	cache: Cache;
	session?: SessionRuntime;
	llmCacheRuntime?: LlmCacheRuntime;
}>;

type BuildServerOptions = Readonly<{
	env?: Env;
	integrations?: AppIntegrations;
	disputeRuntime?: DisputeHttpRuntime;
	conversationRuntime?: ConversationHttpRuntime;
	/** Inject durable stores in tests; otherwise built from env flags. */
	productiveDataStores?: ProductiveDataStores | null;
}>;

type DemoRuntime = Readonly<{
	dispute: DisputeHttpRuntime;
	conversation: ConversationHttpRuntime;
}>;

export async function buildServer(options: BuildServerOptions = {}) {
	const runtimeEnv = options.env ?? env;
	validateRuntimeConfiguration(runtimeEnv);
	const knowledgeGraphRuntime = createKnowledgeGraphRuntime(runtimeEnv);
	const kgAdminService = createKgAdminService(runtimeEnv);
	let knowledgeGraphJev:
		| Awaited<ReturnType<typeof createKnowledgeGraphSelector>>
		| undefined;
	if (
		knowledgeGraphRuntime !== null &&
		runtimeEnv.JEV_ENABLED &&
		runtimeEnv.VERTEX_AI_ENABLED
	) {
		knowledgeGraphJev = await createKnowledgeGraphSelector(runtimeEnv).catch(
			() => undefined,
		);
	}
	const ragRetrievalRuntime =
		knowledgeGraphRuntime === null
			? null
			: createRagRetrievalRuntime({
					knowledgeGraph: knowledgeGraphRuntime,
					...(knowledgeGraphJev === undefined ? {} : { knowledgeGraphJev }),
				});
	const productiveDataStores =
		options.productiveDataStores !== undefined
			? options.productiveDataStores
			: createProductiveDataStores(runtimeEnv);
	const integrations = options.integrations ?? {
		database: new LocalDatabase(),
		bucket: new LocalBucket(),
		cache: new LocalCache(),
		...(runtimeEnv.SESSION_STORE_ENABLED
			? { session: await createSessionRuntime(runtimeEnv) }
			: {}),
		...(runtimeEnv.LLM_CACHE_ENABLED && !runtimeEnv.SESSION_STORE_ENABLED
			? { llmCacheRuntime: await createLlmCacheRuntime(runtimeEnv) }
			: {}),
	};
	const app = Fastify({
		// WebSockets are long-lived. Do not let a stale browser connection block
		// process shutdown during a deploy or a controlled test teardown.
		forceCloseConnections: true,
		bodyLimit: Math.max(
			runtimeEnv.MAX_BODY_BYTES,
			runtimeEnv.CHAT_MAX_ATTACHMENT_BYTES,
		),
		logger: {
			level: runtimeEnv.LOG_LEVEL,
		},
	});
	app.decorate("knowledgeGraphRuntime", knowledgeGraphRuntime);
	app.decorate("ragRetrievalRuntime", ragRetrievalRuntime);
	app.decorate("kgAdminService", kgAdminService);
	app.decorate("productiveDataStores", productiveDataStores);
	app.addContentTypeParser(
		"application/octet-stream",
		{ parseAs: "buffer" },
		(_request, body, done) => done(null, body),
	);
	app.addContentTypeParser(
		/^image\/|^audio\//,
		{ parseAs: "buffer" },
		(_request, body, done) => done(null, body),
	);
	await app.register(cookie);
	await app.register(cors, {
		origin:
			runtimeEnv.CORS_ALLOWED_ORIGINS.length === 0
				? false
				: runtimeEnv.CORS_ALLOWED_ORIGINS.split(",")
						.map((value) => value.trim())
						.filter(Boolean),
		credentials: true,
	});
	await app.register(websocket, {
		options: { maxPayload: runtimeEnv.MAX_BODY_BYTES },
	});
	if (integrations.session) {
		app.addHook("onClose", async () => {
			await integrations.session?.close();
		});
	}
	if (integrations.llmCacheRuntime) {
		app.addHook("onClose", async () => {
			await integrations.llmCacheRuntime?.close();
		});
	}

	// Live telemetry of the baseline chat (ADR 0012/0015). Null unless the
	// baseline pipeline is selected and Langfuse or BigQuery persistence is on.
	const liveBaselineObserver =
		options.conversationRuntime === undefined
			? await createLiveBaselineObserver(runtimeEnv, {
					// Closed codes only: no message, id or content ever reaches the log.
					onFailure: (reason) =>
						app.log.warn(
							{ event: "live_telemetry_delivery_failed", reason },
							"live telemetry delivery failed",
						),
				})
			: null;
	if (liveBaselineObserver !== null) {
		app.log.info(
			{ event: "live_telemetry_enabled", ...liveBaselineObserver.channels },
			"live telemetry enabled for the baseline chat",
		);
		app.addHook("onClose", async () => {
			await liveBaselineObserver.shutdown();
		});
	}

	if (
		liveBaselineObserver === null &&
		options.conversationRuntime === undefined &&
		(runtimeEnv.OTEL_ENABLED || runtimeEnv.BIGQUERY_EVAL_DATASET.length > 0)
	) {
		app.log.warn(
			{ event: "live_telemetry_not_used", pipeline: runtimeEnv.CHAT_PIPELINE },
			"telemetry is configured but only CHAT_PIPELINE=baseline emits it",
		);
	}

	registerErrorHandler(app);
	const demoRuntime = runtimeEnv.DEMO_AUTH_ENABLED
		? await createDemoRuntime(runtimeEnv, {
				...(liveBaselineObserver === null
					? {}
					: { baselineObserver: liveBaselineObserver.observer }),
				...(integrations.session
					? { sessionRuntime: integrations.session }
					: {}),
				llmCache:
					integrations.session?.llmCache ??
					integrations.llmCacheRuntime?.llmCache ??
					new NoopLlmEphemeralCache(),
				knowledgeGraphRuntime,
				ragRetrievalRuntime,
				productive: productiveDataStores,
			})
		: undefined;
	const conversationRuntime =
		options.conversationRuntime ?? demoRuntime?.conversation;
	const disputeRuntime = options.disputeRuntime ?? demoRuntime?.dispute;
	registerRoutes(
		app,
		new ItemService(new MemoryItemStore()),
		runtimeEnv,
		integrations,
		disputeRuntime,
		conversationRuntime,
		kgAdminService,
	);
	await app.register(apiReference, {
		routePrefix: "/docs",
		configuration: {
			url: "/openapi.json",
		},
	});
	return app;
}

async function createDemoRuntime(
	runtimeEnv: Env,
	options: {
		sessionRuntime?: SessionRuntime;
		llmCache?: LlmEphemeralCache;
		knowledgeGraphRuntime?: KnowledgeGraphRuntime | null;
		ragRetrievalRuntime?: RagRetrievalRuntime | null;
		productive?: ProductiveDataStores | null;
		baselineObserver?: BaselineRunObserver;
	} = {},
): Promise<DemoRuntime> {
	const sessions = new CachingSessionStore(
		options.sessionRuntime?.sessionStore ?? new InMemorySessionStore(),
	);
	const publisher = new InMemoryConversationEventPublisher();
	const inMemoryAttachments = new InMemoryAttachmentStore();
	const attachments =
		options.productive?.attachmentStore ?? inMemoryAttachments;
	const conversationStore =
		options.productive?.conversationStore ?? new InMemoryConversationStore();
	const { transactionId, disputeId, caseId } = demoDisputePack.ids;
	const disputeStore = new InMemoryDisputeSupportStore({
		transactions: [...demoDisputePack.transactions],
		disputes: [...demoDisputePack.disputes],
		cases: [...demoDisputePack.cases],
	});
	const bqActors = runtimeEnv.BIGQUERY_ENABLED
		? new BigQueryDemoActorDirectory(
				new BigQuery({ projectId: runtimeEnv.GOOGLE_CLOUD_PROJECT }),
				runtimeEnv.GOOGLE_CLOUD_PROJECT,
				runtimeEnv.BIGQUERY_DATASET || "hackathon",
				runtimeEnv.DEMO_ACTOR_HMAC_KEY,
			)
		: null;
	let demoActors: DemoActorDirectory =
		bqActors ?? new InMemoryDemoActorDirectory();
	if (options.productive?.userProfileStore) {
		demoActors = new UserProfileBackedActorDirectory(
			demoActors,
			options.productive.userProfileStore,
		);
	}
	const runner =
		runtimeEnv.CHAT_PIPELINE === "baseline"
			? await createBaselineRunner(runtimeEnv, bqActors, {
					llmCache: options.llmCache ?? new NoopLlmEphemeralCache(),
					knowledgeGraphRuntime: options.knowledgeGraphRuntime ?? null,
					customerIdentity: options.productive?.customerIdentity ?? null,
					...(options.baselineObserver === undefined
						? {}
						: { observer: options.baselineObserver }),
				})
			: runtimeEnv.CHAT_PIPELINE === "control_plane"
				? createControlPlaneConversationRuntime({
						sessions,
						signal: new HeuristicHitlDecisionSignalProvider(),
						model: new SafeInformationalModelProvider(),
						guardrail: createGuardrailProvider(runtimeEnv),
						ragRuntime: await withDemoStructuredRag(runtimeEnv, bqActors, {
							base: options.ragRetrievalRuntime ?? null,
							customerIdentity: options.productive?.customerIdentity ?? null,
						}),
						routeFromSignal: true,
					}).runner
				: deterministicConversationRunner;
	const conversation: ConversationHttpRuntime = {
		sessions,
		publisher,
		attachments,
		...(options.productive
			? {}
			: { demoAttachmentUpload: inMemoryAttachments }),
		demoFixtures: { transactionId, disputeId, caseId },
		demoActors,
		conversations: new ConversationService(
			conversationStore,
			attachments,
			publisher,
			runner,
		),
	};
	return {
		conversation,
		dispute: {
			auth: new SessionAuthService(
				{
					async verify() {
						throw new Error("demo_sessions_do_not_accept_identity_tokens");
					},
				},
				sessions,
			),
			support: new DisputeSupportService(
				disputeStore,
				new InMemoryDisputeEventSink(),
			),
		},
	};
}

/**
 * Adds the Structured branch to the control_plane graph when BigQuery, the JEV
 * and Vertex AI are on; otherwise the graph keeps only what `base` carries and
 * Structured reads fail closed. The customer id comes from the session, never
 * from the prompt or the model.
 */
async function withDemoStructuredRag(
	runtimeEnv: Env,
	demoActors: BigQueryDemoActorDirectory | null,
	options: {
		base: RagRetrievalRuntime | null;
		customerIdentity: CustomerIdentityResolver | null;
	},
): Promise<RagRetrievalRuntime | null> {
	if (
		demoActors === null ||
		!runtimeEnv.BIGQUERY_ENABLED ||
		!runtimeEnv.JEV_ENABLED ||
		!runtimeEnv.VERTEX_AI_ENABLED
	) {
		return options.base;
	}
	const selector = await createStructuredSelector(runtimeEnv);
	const durableIdentity = options.customerIdentity;
	const structured = await createStructuredRag(runtimeEnv, {
		selector,
		identity: {
			async resolve(session) {
				if (durableIdentity !== null) {
					const bound = await durableIdentity.resolve(session);
					if (bound !== null) return bound;
				}
				return demoActors.customerIdForActor(session.userId);
			},
		},
	});
	return withStructuredRag(options.base, {
		catalog: structured.catalog,
		rag: structured.rag,
		selector,
	});
}

async function createBaselineRunner(
	runtimeEnv: Env,
	demoActors: BigQueryDemoActorDirectory | null,
	options: {
		llmCache: LlmEphemeralCache;
		knowledgeGraphRuntime: KnowledgeGraphRuntime | null;
		customerIdentity?: CustomerIdentityResolver | null;
		observer?: BaselineRunObserver;
	},
) {
	if (demoActors === null) {
		throw new Error("baseline_demo_actor_directory_unavailable");
	}
	const queryRuntime = await createStructuredQueryRuntime({
		BIGQUERY_ENABLED: runtimeEnv.BIGQUERY_ENABLED,
		BIGQUERY_DATASET: runtimeEnv.BIGQUERY_DATASET,
		BIGQUERY_JOB_TIMEOUT_MS: runtimeEnv.BIGQUERY_JOB_TIMEOUT_MS,
		STRUCTURED_CATALOG_PATH: runtimeEnv.BASELINE_QUERY_CATALOG_PATH,
		GOOGLE_CLOUD_PROJECT: runtimeEnv.GOOGLE_CLOUD_PROJECT,
		GOOGLE_CLOUD_LOCATION: runtimeEnv.GOOGLE_CLOUD_LOCATION,
	});
	const durableIdentity = options.customerIdentity ?? null;
	const identity: CustomerIdentityResolver = {
		async resolve(session) {
			if (durableIdentity !== null) {
				const bound = await durableIdentity.resolve(session);
				if (bound !== null) return bound;
			}
			return demoActors.customerIdForActor(session.userId);
		},
	};
	const knowledgeGraph = options.knowledgeGraphRuntime;
	return new BaselineConversationRunner({
		model: createVertexBaselineChatProvider(runtimeEnv),
		tool: new BaselineQueryTool({
			source: queryRuntime.source,
			options: queryRuntime.options,
			executor: queryRuntime.executor,
			identity,
		}),
		maxRetrievalAttempts: runtimeEnv.BASELINE_MAX_RETRIEVAL_ATTEMPTS,
		...(options.observer === undefined ? {} : { observer: options.observer }),
		llmCache: options.llmCache,
		llmCacheTtlSeconds: runtimeEnv.LLM_CACHE_TTL_SECONDS,
		modelId: runtimeEnv.VERTEX_AI_MODEL || "baseline",
		resolveCacheVersions: async ({ tenantId, userId }) => {
			const session = {
				sessionId: "llm-cache",
				userId,
				tenantId,
				scopes: [],
				roles: ["customer"],
				capabilities: [],
				sessionVersion: 1,
				createdAt: "1970-01-01T00:00:00.000Z",
				lastSeenAt: "1970-01-01T00:00:00.000Z",
				expiresAt: "1970-01-01T00:00:00.000Z",
				revokedAt: null,
			};
			const structured = await queryRuntime.catalog.load({
				session,
				traceId: "llm-cache",
			});
			const catalogVersion =
				structured.status === "ready" ? structured.catalog.version : "none";
			let graphRunId = "none";
			if (knowledgeGraph !== null) {
				const kgLoad = await knowledgeGraph.catalog.load({
					session,
					traceId: "llm-cache",
				});
				if (kgLoad.status === "ready") {
					const snapshot = knowledgeGraph.catalog.resolve({
						session,
						catalog: kgLoad.catalog,
					});
					graphRunId = snapshot?.runId ?? "none";
				}
			}
			return { graphRunId, catalogVersion };
		},
	}).run;
}
