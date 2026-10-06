import { describe, expect, test } from "bun:test";
import { loadSpec, validateSpec } from "../../scripts/validate-openapi.js";
import { envSchema } from "../../src/config/env.js";
import { buildServer } from "../../src/http/server.js";

const demoEnv = envSchema.parse({
	APP_ENV: "dev",
	DEMO_AUTH_ENABLED: true,
	REALTIME_ENABLED: true,
	CORS_ALLOWED_ORIGINS: "http://localhost:3001",
	SESSION_STORE_ENABLED: false,
});

describe("OpenAPI contract", () => {
	test("spec passes project rules", async () => {
		expect(validateSpec(await loadSpec())).toEqual([]);
	});

	test("server exposes canonical spec", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "GET",
			url: "/openapi.json",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().info.title).toBe("Dispute Transaction Support API");
	});

	test("docs endpoint serves Scalar API reference", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "GET",
			url: "/docs/",
		});

		expect(response.statusCode).toBe(200);
		expect(response.headers["content-type"]).toContain("text/html");
		expect(response.body).toContain("openapi.json");
	});

	test("health endpoint is present in spec and implementation", async () => {
		const spec = await loadSpec();
		const app = await buildServer();
		const response = await app.inject({
			method: "GET",
			url: "/v1/health/live",
		});

		expect(spec.paths?.["/v1/health/live"]?.get?.operationId).toBe(
			"getLiveHealth",
		);
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ status: "ok" });
	});

	test("error endpoint follows problem contract", async () => {
		const app = await buildServer({ env: demoEnv });
		const login = await app.inject({
			method: "POST",
			url: "/v1/demo/sessions",
			payload: { actorId: "demo-customer-1" },
		});
		const setCookie = login.headers["set-cookie"];
		const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
		const response = await app.inject({
			method: "GET",
			url: "/v1/conversations/missing-thread",
			headers: { cookie: cookie ?? "" },
		});

		expect(response.statusCode).toBe(409);
		expect(response.headers["content-type"]).toContain(
			"application/problem+json",
		);
		expect(response.headers["x-error-code"]).toBe(response.json().code);
		expect(response.json()).toMatchObject({
			type: "https://example.com/errors/SVC-CORE-4003",
			title: "resource_state_conflict",
			status: 409,
			code: "SVC-CORE-4003",
			category: "STATE_CONFLICT",
			detail_key: "core.resource_state_conflict",
			correlation: {
				trace_id: expect.any(String),
			},
		});
		expect(response.json().error).toBeUndefined();
		await app.close();
	});

	test("validation errors use problem contract", async () => {
		const app = await buildServer({ env: demoEnv });
		const response = await app.inject({
			method: "POST",
			url: "/v1/demo/sessions",
			payload: {},
		});

		expect(response.statusCode).toBe(422);
		expect(response.headers["x-error-code"]).toBe("SVC-CORE-1002");
		expect(response.json()).toMatchObject({
			type: "https://example.com/errors/SVC-CORE-1002",
			title: "schema_validation_failed",
			status: 422,
			code: "SVC-CORE-1002",
			category: "VALIDATION",
			detail_key: "core.schema_validation_failed",
			behavior: {
				retryable: "never",
				financial_effect: "none",
				human_action: "none",
				agent_hint: "FIX_AND_RETRY",
				retry_after_s: null,
			},
		});
		await app.close();
	});

	test("serviceToken scheme remains declared without items routes", async () => {
		const spec = await loadSpec();

		expect(spec.components?.securitySchemes?.serviceToken).toEqual({
			type: "http",
			scheme: "bearer",
			description:
				"Optional service-to-service token. Required on protected routes when SERVICE_TOKEN is configured.",
		});
		expect(spec.paths?.["/v1/items"]).toBeUndefined();
		expect(spec.paths?.["/v1/items/{itemId}"]).toBeUndefined();
		expect(spec.components?.schemas?.Item).toBeUndefined();
		expect(spec.components?.schemas?.CreateItemRequest).toBeUndefined();
		expect(spec.paths?.["/v1/health/live"]?.get?.security).toBeUndefined();
	});

	test("OpenAPI enumerates every HTTP route registered by the server", async () => {
		const spec = await loadSpec();
		const registered = [
			"GET /openapi.json",
			"GET /asyncapi.json",
			"GET /v1/health/live",
			"GET /v1/health/ready",
			"POST /v1/sessions",
			"GET /v1/transactions/{transactionId}",
			"GET /v1/disputes/{disputeId}",
			"GET /v1/dispute-cases/{caseId}",
			"POST /v1/dispute-cases/{caseId}/escalations",
			"POST /v1/approvals/{approvalId}/decisions",
			"GET /v1/demo/actors",
			"GET /v1/demo/fixtures",
			"POST /v1/demo/sessions",
			"GET /v1/me",
			"GET /v1/conversations",
			"GET /v1/conversations/{threadId}",
			"POST /v1/uploads",
			"PUT /v1/demo/uploads/{attachmentId}",
			"POST /v1/uploads/{attachmentId}/complete",
			"GET /v1/admin/kg/current",
			"GET /v1/admin/kg/versions",
			"GET /v1/admin/kg/diff",
			"POST /v1/admin/kg/promote",
			"POST /v1/admin/kg/rollback",
		];
		const documented = Object.entries(spec.paths ?? {}).flatMap(
			([path, item]) =>
				Object.keys(item)
					.filter((method) =>
						["get", "post", "put", "patch", "delete"].includes(method),
					)
					.map((method) => `${method.toUpperCase()} ${path}`),
		);

		expect(documented.sort()).toEqual(registered.sort());
	});
});
