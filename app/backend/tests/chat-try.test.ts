import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { assertLocalUrl, openChat } from "../scripts/chat-try.js";
import { envSchema } from "../src/config/env.js";
import { buildServer } from "../src/http/server.js";

const origin = "http://localhost:3001";
const runtimeEnv = envSchema.parse({
	APP_ENV: "dev",
	DEMO_AUTH_ENABLED: true,
	REALTIME_ENABLED: true,
	CORS_ALLOWED_ORIGINS: origin,
});

let app: Awaited<ReturnType<typeof buildServer>>;
let baseUrl = "";

beforeAll(async () => {
	app = await buildServer({ env: runtimeEnv });
	baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });
});

afterAll(async () => {
	await app.close();
});

describe("chat client against the real server", () => {
	test("sends a message and gets the finished turn", async () => {
		const events: string[] = [];
		const chat = await openChat({
			baseUrl,
			actorId: "demo-customer-1",
			origin,
			timeoutMs: 10_000,
			onEvent: (event) => events.push(event.type),
		});
		const turn = await chat.send("hola, ¿cómo va mi disputa?");
		chat.close();
		expect(turn.problem).toBeNull();
		expect(turn.status).toBe("completed");
		expect(turn.reply.length).toBeGreaterThan(0);
		expect(turn.threadId).not.toBeNull();
		expect(turn.traceId).not.toBeNull();
		expect(events).toContain("session.ready");
		expect(events).toContain("assistant.completed");
	});

	test("a second message continues the same thread", async () => {
		const chat = await openChat({
			baseUrl,
			actorId: "demo-customer-1",
			origin,
			timeoutMs: 10_000,
		});
		const first = await chat.send("primer mensaje");
		const second = await chat.send("segundo mensaje");
		chat.close();
		expect(second.threadId).toBe(first.threadId);
		expect(second.status).toBe("completed");
	});

	test("an origin the backend does not allow is refused", async () => {
		await expect(
			openChat({
				baseUrl,
				actorId: "demo-customer-1",
				origin: "http://evil.example",
				timeoutMs: 5_000,
			}),
		).rejects.toThrow(/chat_socket_(closed|rejected|error)/);
	});

	test("an unknown actor cannot log in", async () => {
		await expect(
			openChat({
				baseUrl,
				actorId: "nobody",
				origin,
				timeoutMs: 5_000,
			}),
		).rejects.toThrow(/chat_login_failed/);
	});
});

describe("the remote-URL guard", () => {
	test("accepts this machine without a flag", () => {
		for (const url of [
			"http://localhost:3000",
			"http://127.0.0.1:8010",
			"http://[::1]:3000",
		]) {
			expect(() => assertLocalUrl(url, false)).not.toThrow();
		}
	});

	test("refuses any other host unless explicitly allowed", () => {
		const remote = "https://bankai-backend.example.run.app";
		expect(() => assertLocalUrl(remote, false)).toThrow(
			"chat_remote_url_needs_allow_remote:bankai-backend.example.run.app",
		);
		expect(() => assertLocalUrl(remote, true)).not.toThrow();
	});
});
