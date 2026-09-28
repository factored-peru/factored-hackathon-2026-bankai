import { describe, expect, test } from "bun:test";
import { env } from "../src/config/env.js";
import { buildServer } from "../src/http/server.js";

describe("health routes", () => {
	test("live returns ok", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "GET",
			url: "/v1/health/live",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ status: "ok" });
	});

	test("ready reports optional integrations as disabled by default", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "GET",
			url: "/v1/health/ready",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			status: "ok",
			details: {
				storeReady: true,
				database: "disabled",
				bucket: "disabled",
				cache: "disabled",
				session: "disabled",
			},
		});
	});

	test("ready counts enabled optional integrations", async () => {
		const app = await buildServer({
			env: {
				...env,
				DATABASE_ENABLED: true,
				BUCKET_ENABLED: true,
				CACHE_ENABLED: true,
			},
		});
		const response = await app.inject({
			method: "GET",
			url: "/v1/health/ready",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			status: "ok",
			details: {
				storeReady: true,
				database: "ready",
				bucket: "ready",
				cache: "ready",
			},
		});
	});
});
