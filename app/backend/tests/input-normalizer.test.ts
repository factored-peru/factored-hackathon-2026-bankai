import { describe, expect, test } from "bun:test";
import {
	maxUserMessageCharacters,
	normalizeUserMessage,
} from "../src/services/control-plane/input-normalizer.js";

describe("agent input normalization", () => {
	test("normalizes unicode without changing an ordinary message", () => {
		expect(normalizeUserMessage("cafe\u0301")).toEqual({
			status: "accepted",
			content: "café",
		});
	});

	test("rejects encoded payloads that Model Armor cannot inspect", () => {
		expect(normalizeUserMessage("A".repeat(80))).toEqual({
			status: "rejected",
			reasonCode: "encoded_content_not_supported",
		});
	});

	test("rejects empty, control-character and oversized messages", () => {
		expect(normalizeUserMessage("")).toEqual({
			status: "rejected",
			reasonCode: "empty_message",
		});
		expect(normalizeUserMessage("hello\u0000world")).toEqual({
			status: "rejected",
			reasonCode: "invalid_control_character",
		});
		expect(
			normalizeUserMessage("x".repeat(maxUserMessageCharacters + 1)),
		).toEqual({
			status: "rejected",
			reasonCode: "message_too_large",
		});
	});
});
