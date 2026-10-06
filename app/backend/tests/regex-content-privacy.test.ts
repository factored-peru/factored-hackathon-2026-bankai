import { describe, expect, test } from "bun:test";
import type { SessionContext } from "../src/domain/session.js";
import { RegexContentPrivacyProvider } from "../src/integrations/providers/regex-content-privacy-provider.js";

const session: SessionContext = {
	sessionId: "s",
	userId: "u",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-10-05T00:00:00.000Z",
	lastSeenAt: "2026-10-05T00:00:00.000Z",
	expiresAt: "2026-10-05T01:00:00.000Z",
	revokedAt: null,
};

async function redactions(content: string) {
	const provider = new RegexContentPrivacyProvider();
	const result = await provider.deidentify({
		session,
		surface: "generation_context",
		content,
		traceId: "t",
	});
	return result.replacements.map((entry) => entry.safeValue);
}

describe("phones stay redacted in the supported countries", () => {
	const colombia = [
		"+57 300 123 4567",
		"300 123 4567",
		"300-123-4567",
		"(601) 234 5678",
	];
	const mexico = [
		"+52 55 1234 5678",
		"55 1234 5678",
		"(55) 1234-5678",
		"55-1234-5678",
		"+52 1 55 1234 5678",
	];
	const brazil = [
		"+55 11 91234-5678",
		"(11) 91234-5678",
		"11 91234 5678",
		"(11) 1234-5678",
	];

	for (const [country, phones] of [
		["Colombia", colombia],
		["México", mexico],
		["Brasil", brazil],
	] as const) {
		for (const phone of phones) {
			test(`${country}: ${phone}`, async () => {
				expect(await redactions(`llámame al ${phone} gracias`)).toEqual([
					"[PHONE_REDACTED]",
				]);
			});
		}
	}

	test("an unformatted 10-digit mobile is still hidden", async () => {
		expect((await redactions("3001234567")).length).toBe(1);
	});

	test("a generic international number is still hidden", async () => {
		expect(await redactions("202-403-1500")).toEqual(["[PHONE_REDACTED]"]);
	});
});

describe("other personal data stays redacted", () => {
	test("email", async () => {
		expect(await redactions("ana@example.com")).toEqual(["[EMAIL_REDACTED]"]);
	});

	test("a 16-digit account or card number", async () => {
		expect((await redactions("4111111111111111")).length).toBe(1);
	});
});

describe("dates and amounts are not phones", () => {
	const visible = [
		"2024-03-15",
		"2024-03-15T10:20:30.000Z",
		"15-03-2024",
		"12910708.44",
		"150000000.16",
		"1.234.567,89",
		"PRD-IHZLXOKTY7DU",
	];
	for (const value of visible) {
		test(value, async () => {
			expect(await redactions(`valor ${value} fin`)).toEqual([]);
		});
	}

	test("a date next to a phone only hides the phone", async () => {
		expect(await redactions("2024-03-15 llamó al 300 123 4567")).toEqual([
			"[PHONE_REDACTED]",
		]);
	});
});
