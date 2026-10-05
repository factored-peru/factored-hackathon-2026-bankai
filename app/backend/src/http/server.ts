import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { BigQuery } from "@google-cloud/bigquery";
import apiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { type Env, env, validateRuntimeConfiguration } from "../config/env.js";
import { demoDisputePack } from "../domain/disputes/demo-fixtures.js";
import { BigQueryDemoActorDirectory } from "../integrations/bigquery/bigquery-demo-actor-directory.js";
import { createStructuredQueryRuntime } from "../integrations/bigquery/structured-rag-runtime.js";
import { LocalBucket, type ObjectBucket } from "../integrations/bucket.js";
import { type Cache, LocalCache } from "../integrations/cache.js";
import { type Database, LocalDatabase } from "../integrations/database.js";
import {
	createKnowledgeGraphRuntime,
	type KnowledgeGraphRuntime,
} from "../integrations/kg/gcs-knowledge-graph-artifact-repository.js";
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
import { createVertexBaselineChatProvider } from "../integrations/providers/vertex-baseline-chat-provider.js";
import {
	createSessionRuntime,
	type SessionRuntime,
} from "../integrations/session-runtime.js";
import { BaselineConversationRunner } from "../services/baseline/baseline-conversation-runner.js";
import { BaselineQueryTool } from "../services/baseline/baseline-query-tool.js";
import { ConversationService } from "../services/conversations/conversation-service.js";
import { deterministicConversationRunner } from "../services/conversations/deterministic-conversation-runner.js";
import { DisputeSupportService } from "../services/disputes/dispute-support-service.js";
import { ItemService } from "../services/item-service.js";
import type { CustomerIdentityResolver } from "../services/ports/customer-identity.js";
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
	}
}

export type AppIntegrations = Readonly<{
	database: Database;
	bucket: ObjectBucket;
	cache: Cache;
	session?: SessionRuntime;
}>;

type BuildServerOptions = Readonly<{
	env?: Env;
	integrations?: AppIntegrations;
	disputeRuntime?: DisputeHttpRuntime;
	conversationRuntime?: ConversationHttpRuntime;
}>;

type DemoRuntime = Readonly<{
	dispute: DisputeHttpRuntime;
	conversation: ConversationHttpRuntime;
}>;

export async function buildServer(options: BuildServerOptions = {}) {
	const runtimeEnv = options.env ?? env;
	validateRuntimeConfiguration(runtimeEnv);
	const knowledgeGraphRuntime = createKnowledgeGraphRuntime(runtimeEnv);
	const integrations = options.integrations ?? {
		database: new LocalDatabase(),
		bucket: new LocalBucket(),
		cache: new LocalCache(),
		...(runtimeEnv.SESSION_STORE_ENABLED
			? { session: await createSessionRuntime(runtimeEnv) }
			: {}),
	};
	const app = Fastify({
		bodyLimit: Math.max(
			runtimeEnv.MAX_BODY_BYTES,
			runtimeEnv.CHAT_MAX_ATTACHMENT_BYTES,
		),
		logger: {
			level: runtimeEnv.LOG_LEVEL,
		},
	});
	app.decorate("knowledgeGraphRuntime", knowledgeGraphRuntime);
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

	registerErrorHandler(app);
	const demoRuntime = runtimeEnv.DEMO_AUTH_ENABLED
		? await createDemoRuntime(runtimeEnv)
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
	);
	await app.register(apiReference, {
		routePrefix: "/docs",
		configuration: {
			url: "/openapi.json",
		},
	});
	return app;
}

async function createDemoRuntime(runtimeEnv: Env): Promise<DemoRuntime> {
	const sessions = new InMemorySessionStore();
	const publisher = new InMemoryConversationEventPublisher();
	const attachments = new InMemoryAttachmentStore();
	const { transactionId, disputeId, caseId } = demoDisputePack.ids;
	const disputeStore = new InMemoryDisputeSupportStore({
		transactions: [...demoDisputePack.transactions],
		disputes: [...demoDisputePack.disputes],
		cases: [...demoDisputePack.cases],
	});
	const demoActors = runtimeEnv.BIGQUERY_ENABLED
		? new BigQueryDemoActorDirectory(
				new BigQuery({ projectId: runtimeEnv.GOOGLE_CLOUD_PROJECT }),
				runtimeEnv.GOOGLE_CLOUD_PROJECT,
				runtimeEnv.BIGQUERY_DATASET || "hackathon",
				runtimeEnv.DEMO_ACTOR_HMAC_KEY,
			)
		: new InMemoryDemoActorDirectory();
	const runner =
		runtimeEnv.CHAT_PIPELINE === "baseline"
			? await createBaselineRunner(runtimeEnv, demoActors)
			: deterministicConversationRunner;
	const conversation: ConversationHttpRuntime = {
		sessions,
		publisher,
		attachments,
		demoAttachmentUpload: attachments,
		demoFixtures: { transactionId, disputeId, caseId },
		demoActors,
		conversations: new ConversationService(
			new InMemoryConversationStore(),
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

async function createBaselineRunner(
	runtimeEnv: Env,
	demoActors: BigQueryDemoActorDirectory | InMemoryDemoActorDirectory,
) {
	if (!(demoActors instanceof BigQueryDemoActorDirectory)) {
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
	const identity: CustomerIdentityResolver = {
		resolve: (session) => demoActors.customerIdForActor(session.userId),
	};
	return new BaselineConversationRunner({
		model: createVertexBaselineChatProvider(runtimeEnv),
		tool: new BaselineQueryTool({
			source: queryRuntime.source,
			options: queryRuntime.options,
			executor: queryRuntime.executor,
			identity,
		}),
		maxRetrievalAttempts: runtimeEnv.BASELINE_MAX_RETRIEVAL_ATTEMPTS,
	}).run;
}
