import { describe, expect, test } from "bun:test";
import { loadSpec, validateSpec } from "../../scripts/validate-openapi.js";
import { buildServer } from "../../src/http/server.js";

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
		const app = await buildServer();
		const response = await app.inject({
			method: "GET",
			url: "/v1/items/missing",
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
	});

	test("validation errors use problem contract", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "POST",
			url: "/v1/items",
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
	});

	test("items routes declare service token security", async () => {
		const spec = await loadSpec();

		expect(spec.components?.securitySchemes?.serviceToken).toEqual({
			type: "http",
			scheme: "bearer",
			description:
				"Optional service-to-service token. Required on protected routes when SERVICE_TOKEN is configured.",
		});
		expect(spec.paths?.["/v1/items"]?.post?.security).toEqual([
			{ serviceToken: [] },
		]);
		expect(spec.paths?.["/v1/items/{itemId}"]?.get?.security).toEqual([
			{ serviceToken: [] },
		]);
		expect(spec.paths?.["/v1/health/live"]?.get?.security).toBeUndefined();
	});

	test("OpenAPI enumerates every HTTP route registered by the server", async () => {
		const spec = await loadSpec();
		const registered = [
			"GET /openapi.json",
			"GET /asyncapi.json",
			"GET /v1/health/live",
			"GET /v1/health/ready",
			"POST /v1/items",
			"GET /v1/items/{itemId}",
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
