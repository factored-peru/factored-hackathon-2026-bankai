import { describe, expect, test } from "bun:test";
import { envSchema } from "../src/config/env.js";
import { buildServer } from "../src/http/server.js";

const runtimeEnv = envSchema.parse({
	APP_ENV: "dev",
	DEMO_AUTH_ENABLED: true,
	REALTIME_ENABLED: true,
	CORS_ALLOWED_ORIGINS: "http://localhost:3001",
});

describe("conversation HTTP and websocket contract", () => {
	test("creates a mock session and exposes safe context", async () => {
		const app = await buildServer({ env: runtimeEnv });
		const actors = await app.inject({ method: "GET", url: "/v1/demo/actors" });
		expect(actors.statusCode).toBe(200);
		expect(actors.json()[0].actorId).toBe("demo-customer-1");
		const login = await app.inject({
			method: "POST",
			url: "/v1/demo/sessions",
			payload: { actorId: "demo-customer-1" },
		});
		expect(login.statusCode).toBe(201);
		const setCookie = login.headers["set-cookie"];
		const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
		expect(cookie).toContain("HttpOnly");
		const me = await app.inject({
			method: "GET",
			url: "/v1/me",
			headers: { cookie: cookie ?? "" },
		});
		expect(me.json()).toMatchObject({
			userId: "demo-customer-1",
			roles: ["customer"],
		});
		await app.close();
	});

	test("serves synthetic dispute evidence and completes a local binary upload", async () => {
		const app = await buildServer({ env: runtimeEnv });
		const login = await app.inject({
			method: "POST",
			url: "/v1/demo/sessions",
			payload: { actorId: "demo-customer-1" },
		});
		const setCookie = login.headers["set-cookie"];
		const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
		const fixtures = await app.inject({
			method: "GET",
			url: "/v1/demo/fixtures",
		});
		expect(fixtures.json()).toMatchObject({
			transactionId: "demo-transaction-1",
			caseId: "demo-case-1",
		});
		const transaction = await app.inject({
			method: "GET",
			url: `/v1/transactions/${fixtures.json().transactionId}`,
			headers: { cookie: cookie ?? "" },
		});
		expect(transaction.statusCode).toBe(200);
		expect(transaction.json()).toMatchObject({
			provenance: "synthetic_local_fixture",
		});
		const created = await app.inject({
			method: "POST",
			url: "/v1/uploads",
			headers: { cookie: cookie ?? "" },
			payload: {
				kind: "image",
				mediaType: "image/png",
				byteSize: 3,
				filename: "receipt.png",
			},
		});
		expect(created.statusCode).toBe(201);
		const upload = created.json();
		const bytes = await app.inject({
			method: "PUT",
			url: upload.uploadUrl,
			headers: {
				cookie: cookie ?? "",
				"content-type": "image/png",
			},
			payload: Buffer.from([1, 2, 3]),
		});
		expect(bytes.statusCode).toBe(200);
		const completed = await app.inject({
			method: "POST",
			url: `/v1/uploads/${upload.attachment.attachmentId}/complete`,
			headers: { cookie: cookie ?? "" },
		});
		expect(completed.json()).toMatchObject({ status: "ready" });
		await app.close();
	});
});
