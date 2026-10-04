import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { BigQuery } from "@google-cloud/bigquery";
import apiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { type Env, env, validateRuntimeConfiguration } from "../config/env.js";
import { BigQueryDemoActorDirectory } from "../integrations/bigquery/bigquery-demo-actor-directory.js";
import { LocalBucket, type ObjectBucket } from "../integrations/bucket.js";
import { type Cache, LocalCache } from "../integrations/cache.js";
import { type Database, LocalDatabase } from "../integrations/database.js";
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
import {
	createSessionRuntime,
	type SessionRuntime,
} from "../integrations/session-runtime.js";
import { ConversationService } from "../services/conversations/conversation-service.js";
import { deterministicConversationRunner } from "../services/conversations/deterministic-conversation-runner.js";
import { DisputeSupportService } from "../services/disputes/dispute-support-service.js";
import { ItemService } from "../services/item-service.js";
import { SessionAuthService } from "../services/session-auth-service.js";
import { registerErrorHandler } from "./error-handler.js";
import {
	type ConversationHttpRuntime,
	type DisputeHttpRuntime,
	registerRoutes,
} from "./routes.js";

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
		? createDemoRuntime(runtimeEnv)
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

function createDemoRuntime(runtimeEnv: Env): DemoRuntime {
	const sessions = new InMemorySessionStore();
	const publisher = new InMemoryConversationEventPublisher();
	const attachments = new InMemoryAttachmentStore();
	const transactionId = "demo-transaction-1";
	const disputeId = "demo-dispute-1";
	const caseId = "demo-case-1";
	const disputeStore = new InMemoryDisputeSupportStore({
		transactions: [
			{
				transactionId,
				tenantId: "demo-bankai",
				ownerUserId: "demo-customer-1",
				status: "declined",
				amountBucket: "medium",
				currency: "PEN",
				provenance: "synthetic_local_fixture",
				version: "dispute-demo-v1",
			},
		],
		disputes: [
			{
				disputeId,
				transactionId,
				tenantId: "demo-bankai",
				ownerUserId: "demo-customer-1",
				status: "open",
				priority: "normal",
				provenance: "synthetic_local_fixture",
				version: "dispute-demo-v1",
			},
		],
		cases: [
			{
				caseId,
				disputeId,
				tenantId: "demo-bankai",
				ownerUserId: "demo-customer-1",
				status: "open",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		],
	});
	const conversation: ConversationHttpRuntime = {
		sessions,
		publisher,
		attachments,
		demoAttachmentUpload: attachments,
		demoFixtures: { transactionId, disputeId, caseId },
		demoActors: runtimeEnv.BIGQUERY_ENABLED
			? new BigQueryDemoActorDirectory(
					new BigQuery({ projectId: runtimeEnv.GOOGLE_CLOUD_PROJECT }),
					runtimeEnv.GOOGLE_CLOUD_PROJECT,
					runtimeEnv.BIGQUERY_DATASET || "hackathon",
					runtimeEnv.DEMO_ACTOR_HMAC_KEY,
				)
			: new InMemoryDemoActorDirectory(),
		conversations: new ConversationService(
			new InMemoryConversationStore(),
			attachments,
			publisher,
			deterministicConversationRunner,
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
