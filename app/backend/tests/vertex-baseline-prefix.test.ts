import { describe, expect, test } from "bun:test";
import { contentsWithStablePrefix } from "../src/integrations/providers/vertex-baseline-chat-provider.js";

describe("vertex baseline provider cache prefix", () => {
	test("places the stable catalog/graph marker before the user turn", () => {
		expect(
			contentsWithStablePrefix(
				"bankai_cache_context catalogVersion=v1 graphRunId=r1",
				"¿Cuál es mi saldo?",
			),
		).toEqual([
			{
				role: "user",
				parts: [
					{
						text: "bankai_cache_context catalogVersion=v1 graphRunId=r1",
					},
				],
			},
			{ role: "user", parts: [{ text: "¿Cuál es mi saldo?" }] },
		]);
	});

	test("omits an empty stable prefix", () => {
		expect(contentsWithStablePrefix(undefined, "hola")).toEqual([
			{ role: "user", parts: [{ text: "hola" }] },
		]);
		expect(contentsWithStablePrefix("  ", "hola")).toEqual([
			{ role: "user", parts: [{ text: "hola" }] },
		]);
	});
});
