import { describe, expect, test } from "bun:test";
import type {
	DecisionSignal,
	DecisionState,
} from "../src/domain/control/contracts.js";
import { TypeSafePrimaryDecisionSignalProvider } from "../src/integrations/providers/typesafe-primary-signal-provider.js";
import type { DecisionSignalProvider } from "../src/services/ports/control.js";

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

const fallbackSignal: DecisionSignal = {
	provider: "fallback",
	domain: "in_domain",
	routeHint: "llm",
	domainConfidence: 0.99,
	routeConfidence: 0.99,
	riskLevel: "low",
	evidenceSufficient: true,
	requiresEscalation: false,
	modelVersion: "fallback-1",
};

type Recorded = { url: string; init: RequestInit };

function setup(options: {
	answer?: unknown;
	status?: number;
	body?: unknown;
	throws?: boolean;
	relations?: boolean;
}) {
	const requests: Recorded[] = [];
	let fallbackCalls = 0;
	const fallback: DecisionSignalProvider = {
		assess: async () => {
			fallbackCalls += 1;
			return fallbackSignal;
		},
	};
	const fetchStub = (async (
		url: string | URL | Request,
		init?: RequestInit,
	) => {
		requests.push({ url: String(url), init: init ?? {} });
		if (options.throws) throw new Error("network");
		return new Response(
			JSON.stringify(options.body ?? { answers: { route: options.answer } }),
			{ status: options.status ?? 200 },
		);
	}) as unknown as typeof fetch;
	const provider = new TypeSafePrimaryDecisionSignalProvider({
		baseUrl: "https://jev.example.test/",
		apiKey: "jev-secret-key",
		model: "jev-model",
		timeoutMs: 1000,
		fetch: fetchStub,
		relations: options.relations ?? true,
		fallback,
	});
	return {
		requests,
		fallbackCalls: () => fallbackCalls,
		assess: (prompt = "cuanto dinero tengo") =>
			provider.assess({ prompt, state, traceId: "t" }),
	};
}

const choice = (name: string, confidence = 0.95) => ({
	choice: name,
	confidence,
});

describe("request to the JEV", () => {
	test("asks one choice question with only the de-identified message", async () => {
		const { requests, assess } = setup({ answer: choice("customer_data") });
		await assess("mis movimientos");
		expect(requests).toHaveLength(1);
		expect(requests[0]?.url).toBe("https://jev.example.test/v1/systemone");
		const headers = requests[0]?.init.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer jev-secret-key");
		const body = JSON.parse(String(requests[0]?.init.body));
		expect(body.model).toBe("jev-model");
		expect(body.state).toEqual({ user_question: "mis movimientos" });
		expect(Object.keys(body.questions)).toEqual(["route"]);
		expect(body.questions.route.type).toBe("choice");
		expect(Object.keys(body.questions.route.criteria).sort()).toEqual([
			"aggregate_relations",
			"customer_data",
			"general_support",
			"human_request",
			"out_of_domain",
			"unclear",
		]);
	});

	test("does not offer the relations option while the KG is unavailable", async () => {
		const { requests, assess } = setup({
			answer: choice("customer_data"),
			relations: false,
		});
		await assess();
		const body = JSON.parse(String(requests[0]?.init.body));
		expect(Object.keys(body.questions.route.criteria)).not.toContain(
			"aggregate_relations",
		);
	});
});

describe("mapping to the decision signal", () => {
	test("customer data routes to the database branch", async () => {
		const signal = await setup({ answer: choice("customer_data") }).assess();
		expect(signal).toMatchObject({
			provider: "typesafe-jev-primary-v1",
			domain: "in_domain",
			routeHint: "database",
			requiresEscalation: false,
			domainConfidence: 0.95,
			routeConfidence: 0.95,
		});
	});

	test("aggregate relations route to the KG branch", async () => {
		const signal = await setup({
			answer: choice("aggregate_relations"),
		}).assess();
		expect(signal).toMatchObject({ domain: "in_domain", routeHint: "rag" });
	});

	test("general support goes to the model only", async () => {
		const signal = await setup({ answer: choice("general_support") }).assess();
		expect(signal).toMatchObject({
			routeHint: "llm",
			allowedRoutes: ["llm"],
		});
	});

	test("asking for a person requires escalation at high risk", async () => {
		const signal = await setup({ answer: choice("human_request") }).assess();
		expect(signal).toMatchObject({
			domain: "in_domain",
			requiresEscalation: true,
			riskLevel: "high",
		});
	});

	test("out of domain is rejected", async () => {
		const signal = await setup({ answer: choice("out_of_domain") }).assess();
		expect(signal).toMatchObject({
			domain: "out_of_domain",
			routeHint: "reject",
			allowedRoutes: ["reject"],
		});
	});

	test("unclear asks for clarification with capped confidence", async () => {
		const signal = await setup({ answer: choice("unclear", 0.99) }).assess();
		expect(signal).toMatchObject({
			domain: "ambiguous",
			routeHint: "clarify",
			domainConfidence: 0.4,
			routeConfidence: 0.4,
			evidenceSufficient: false,
		});
	});

	test("reads confidence from the probabilities when it is not given", async () => {
		const signal = await setup({
			answer: {
				choice: "customer_data",
				probabilities: { customer_data: 0.9, unclear: 0.1 },
			},
		}).assess();
		expect(signal?.domainConfidence).toBe(0.9);
	});

	test("a missing confidence counts as zero, so the stage will clarify", async () => {
		const signal = await setup({
			answer: { choice: "customer_data" },
		}).assess();
		expect(signal?.domainConfidence).toBe(0);
	});

	test("never carries the key or the model's text", async () => {
		const signal = await setup({ answer: choice("customer_data") }).assess();
		expect(JSON.stringify(signal)).not.toContain("jev-secret-key");
	});
});

describe("fallback to the deterministic provider", () => {
	const cases: Array<[string, Parameters<typeof setup>[0]]> = [
		["a network error", { throws: true }],
		["a server error", { status: 503, body: {} }],
		["a body that is not the expected shape", { body: { nothing: true } }],
		["an answer that is not a choice", { answer: { other: 1 } }],
		["an option it does not know", { answer: choice("invented") }],
		[
			"relations chosen while the KG is unavailable",
			{ answer: choice("aggregate_relations"), relations: false },
		],
	];
	for (const [name, options] of cases) {
		test(`uses it on ${name}`, async () => {
			const { assess, fallbackCalls } = setup(options);
			expect(await assess()).toEqual(fallbackSignal);
			expect(fallbackCalls()).toBe(1);
		});
	}

	test("is not called when the JEV answers", async () => {
		const { assess, fallbackCalls } = setup({
			answer: choice("customer_data"),
		});
		await assess();
		expect(fallbackCalls()).toBe(0);
	});
});
