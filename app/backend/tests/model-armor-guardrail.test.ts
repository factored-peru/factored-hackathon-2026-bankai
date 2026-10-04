import { describe, expect, test } from "bun:test";
import { envSchema, validateRuntimeConfiguration } from "../src/config/env.js";
import { createGuardrailProvider } from "../src/integrations/providers/guardrail-provider-factory.js";
import { ModelArmorGuardrailProvider } from "../src/integrations/providers/model-armor-guardrail-provider.js";

const config = {
	projectId: "proj",
	location: "us-central1",
	template: "bankai-guardrail",
	timeoutMs: 1000,
};

function provider(
	respond: (url: string, body: unknown) => unknown,
	options: { ok?: boolean; reject?: boolean } = {},
) {
	const calls: { url: string; body: unknown }[] = [];
	const instance = new ModelArmorGuardrailProvider(config, {
		accessToken: async () => "token",
		fetch: async (url, init) => {
			const body = JSON.parse(init.body);
			calls.push({ url, body });
			if (options.reject) {
				throw new Error("network");
			}
			return { ok: options.ok ?? true, json: async () => respond(url, body) };
		},
	});
	return { instance, calls };
}

const input = {
	surface: "user_input",
	content: "hola",
	classification: "personal",
	traceId: "t1",
} as const;

const success = (filterMatchState: string, invocationResult = "SUCCESS") => ({
	sanitizationResult: { filterMatchState, invocationResult },
});

describe("ModelArmorGuardrailProvider", () => {
	test("allows NO_MATCH_FOUND and sends prompts to sanitizeUserPrompt", async () => {
		const { instance, calls } = provider(() => success("NO_MATCH_FOUND"));
		const result = await instance.inspect(input);

		expect(result).toEqual({
			provider: "model-armor",
			status: "NO_MATCH_FOUND",
			action: "allow",
			templateVersion: "bankai-guardrail",
			traceId: "t1",
		});
		expect(calls[0]?.url).toBe(
			"https://modelarmor.us-central1.rep.googleapis.com/v1/projects/proj/locations/us-central1/templates/bankai-guardrail:sanitizeUserPrompt",
		);
		expect(calls[0]?.body).toEqual({ userPromptData: { text: "hola" } });
	});

	test("routes retrieved content as prompt and model/final output as response", async () => {
		const { instance, calls } = provider(() => success("NO_MATCH_FOUND"));
		await instance.inspect({ ...input, surface: "retrieved_content" });
		await instance.inspect({ ...input, surface: "model_output" });
		await instance.inspect({ ...input, surface: "final_response" });

		expect(calls.map((call) => call.url.split(":").at(-1))).toEqual([
			"sanitizeUserPrompt",
			"sanitizeModelResponse",
			"sanitizeModelResponse",
		]);
		expect(calls[1]?.body).toEqual({ modelResponseData: { text: "hola" } });
	});

	test("blocks MATCH_FOUND without echoing content", async () => {
		const { instance } = provider(() => success("MATCH_FOUND"));
		const result = await instance.inspect(input);

		expect(result.status).toBe("MATCH_FOUND");
		expect(result.action).toBe("block");
		expect(JSON.stringify(result)).not.toContain("hola");
	});

	test.each([
		["PARTIAL invocation", () => success("NO_MATCH_FOUND", "PARTIAL"), {}],
		["unknown match state", () => success("WHATEVER"), {}],
		["malformed body", () => ({}), {}],
		["non-2xx", () => success("NO_MATCH_FOUND"), { ok: false }],
		["network error", () => success("NO_MATCH_FOUND"), { reject: true }],
	])("fails closed on %s", async (_name, respond, options) => {
		const { instance } = provider(respond, options);
		const result = await instance.inspect(input);

		expect(result.status).toBe("FAILURE");
		expect(result.action).toBe("block");
	});

	test("fails closed when the access token cannot be obtained", async () => {
		const instance = new ModelArmorGuardrailProvider(config, {
			accessToken: async () => {
				throw new Error("no adc");
			},
			fetch: async () => {
				throw new Error("must not be called");
			},
		});

		expect((await instance.inspect(input)).status).toBe("FAILURE");
	});

	test("accepts a full template resource name", async () => {
		const instance = new ModelArmorGuardrailProvider(
			{ ...config, template: "projects/p2/locations/us-central1/templates/t2" },
			{
				accessToken: async () => "token",
				fetch: async (url) => {
					expect(url).toContain(
						"/v1/projects/p2/locations/us-central1/templates/t2:",
					);
					return { ok: true, json: async () => success("NO_MATCH_FOUND") };
				},
			},
		);

		expect((await instance.inspect(input)).templateVersion).toBe("t2");
	});
});

describe("Model Armor configuration", () => {
	test("disabled factory is fail-closed", async () => {
		const guardrail = createGuardrailProvider(envSchema.parse({}));
		const result = await guardrail.inspect(input);

		expect(result.status).toBe("FAILURE");
		expect(result.action).toBe("block");
	});

	test("enabled requires project, location and template", () => {
		const settings = envSchema.parse({ MODEL_ARMOR_ENABLED: "true" });

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"SVC-CORE-9006",
		);
		expect(
			validateRuntimeConfiguration(
				envSchema.parse({
					MODEL_ARMOR_ENABLED: "true",
					MODEL_ARMOR_PROJECT_ID: "p",
					MODEL_ARMOR_LOCATION: "us-central1",
					MODEL_ARMOR_INSPECT_TEMPLATE: "t",
				}),
			).MODEL_ARMOR_ENABLED,
		).toBe(true);
	});
});
