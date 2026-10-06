import { describe, expect, test } from "bun:test";
import type { DecisionState } from "../src/domain/control/contracts.js";
import { HeuristicHitlDecisionSignalProvider } from "../src/integrations/providers/heuristic-hitl-decision-signal-provider.js";
import {
	type GenerateChat,
	VertexSupportModelProvider,
} from "../src/integrations/providers/vertex-support-model-provider.js";

const state: DecisionState = {
	intent: "customer_support",
	actorRole: "customer",
	tenantScope: "self",
	requestedTool: null,
	riskLevel: "low",
	policyFlags: [],
	accountVerified: true,
	amountBucket: null,
	evidenceQuality: "none",
	opaqueHandles: [],
	provenance: [],
};

const decideInput = {
	prompt: "hola, necesito ayuda con mi tarjeta",
	state,
	evidence: [],
	traceId: "t",
};

describe("VertexSupportModelProvider.decide", () => {
	test("turns the generated text into a respond decision with its usage", async () => {
		const requests: Array<{ system: string; user: string }> = [];
		const generate: GenerateChat = async (request) => {
			requests.push(request);
			return {
				text: "  Hola, ¿en qué te ayudo?  ",
				inputTokens: 12,
				outputTokens: 7,
			};
		};
		const result = await new VertexSupportModelProvider(generate).decide(
			decideInput,
		);
		expect(result.value).toEqual({
			kind: "respond",
			response: "Hola, ¿en qué te ayudo?",
		});
		expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 });
		// Only the de-identified message is sent as the user turn.
		expect(requests).toHaveLength(1);
		expect(requests[0]?.user).toBe(decideInput.prompt);
		expect(requests[0]?.system).toContain("no inventes saldos");
	});

	test("falls back to the fixed text when the provider fails", async () => {
		const generate: GenerateChat = async () => {
			throw new Error("vertex_down");
		};
		const result = await new VertexSupportModelProvider(generate).decide(
			decideInput,
		);
		expect(result.value.kind).toBe("respond");
		expect(result.value.kind === "respond" && result.value.response).toContain(
			"Consulté el soporte autorizado",
		);
	});

	test("falls back when the provider returns nothing", async () => {
		const generate: GenerateChat = async () => ({
			text: "   ",
			inputTokens: 1,
			outputTokens: 0,
		});
		const result = await new VertexSupportModelProvider(generate).decide(
			decideInput,
		);
		expect(result.value.kind === "respond" && result.value.response).toContain(
			"Consulté el soporte autorizado",
		);
	});

	test("never sends retrieved evidence to the provider", async () => {
		let sent = "";
		const generate: GenerateChat = async ({ system, user }) => {
			sent = `${system}\n${user}`;
			return { text: "ok", inputTokens: 1, outputTokens: 1 };
		};
		await new VertexSupportModelProvider(generate).decide({
			...decideInput,
			evidence: [
				{
					content: "SECRET-ROWS",
					documentRef: "d",
					sourceType: "s",
					classification: "financial",
					contentHash: "h",
				},
			],
		});
		expect(sent).not.toContain("SECRET-ROWS");
	});
});

describe("VertexSupportModelProvider.composeResponse", () => {
	test("composes evidence deterministically, without calling the provider", async () => {
		let calls = 0;
		const generate: GenerateChat = async () => {
			calls += 1;
			return { text: "x", inputTokens: 1, outputTokens: 1 };
		};
		const evidence = JSON.stringify([
			{
				content: JSON.stringify({ rows: [{ concepto: "compra" }] }),
				documentRef: "recent_transactions:v1",
			},
		]);
		const result = await new VertexSupportModelProvider(
			generate,
		).composeResponse({
			prompt: "movimientos",
			state,
			authorizedResult: evidence,
			traceId: "t",
		});
		expect(result.value).toContain("concepto: compra");
		expect(calls).toBe(0);
	});
});

describe("greetings are conversation, not an ambiguous request", () => {
	const signal = new HeuristicHitlDecisionSignalProvider();
	const assess = (prompt: string) => signal.assess({ prompt, traceId: "t" });

	for (const greeting of [
		"hola",
		"Hola!",
		"buenas tardes",
		"gracias",
		"ok",
		"¡Hola!",
	]) {
		test(`"${greeting}" goes to the model`, async () => {
			const result = await assess(greeting);
			expect(result.domain).toBe("in_domain");
			expect(result.routeHint).toBe("llm");
			expect(result.requiresEscalation).toBe(false);
		});
	}

	test("a short unclear message still asks for detail", async () => {
		expect((await assess("ayuda")).domain).toBe("ambiguous");
	});

	test("a greeting that carries a request keeps its meaning", async () => {
		const result = await assess("hola, quiero hablar con un humano");
		expect(result.requiresEscalation).toBe(true);
	});
});
