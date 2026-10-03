import apiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { type Env, env, validateRuntimeConfiguration } from "../config/env.js";
import { LocalBucket, type ObjectBucket } from "../integrations/bucket.js";
import { type Cache, LocalCache } from "../integrations/cache.js";
import { type Database, LocalDatabase } from "../integrations/database.js";
import { MemoryItemStore } from "../integrations/memory-item-store.js";
import {
	createSessionRuntime,
	type SessionRuntime,
} from "../integrations/session-runtime.js";
import { ItemService } from "../services/item-service.js";
import { registerErrorHandler } from "./error-handler.js";
import { type DisputeHttpRuntime, registerRoutes } from "./routes.js";

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
		logger: {
			level: runtimeEnv.LOG_LEVEL,
		},
	});
	if (integrations.session) {
		app.addHook("onClose", async () => {
			await integrations.session?.close();
		});
	}

	registerErrorHandler(app);
	registerRoutes(
		app,
		new ItemService(new MemoryItemStore()),
		runtimeEnv,
		integrations,
		options.disputeRuntime,
	);
	await app.register(apiReference, {
		routePrefix: "/docs",
		configuration: {
			url: "/openapi.json",
		},
	});
	return app;
}
