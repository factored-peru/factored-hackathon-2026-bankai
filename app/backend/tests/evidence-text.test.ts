import { describe, expect, test } from "bun:test";
import type { SessionContext } from "../src/domain/session.js";
import { RegexContentPrivacyProvider } from "../src/integrations/providers/regex-content-privacy-provider.js";
import { composeEvidenceText } from "../src/services/control-plane/evidence-text.js";
import { GenerationPrivacyService } from "../src/services/privacy/generation-privacy-service.js";

const structured = (rows: unknown[]) =>
	JSON.stringify([
		{
			content: JSON.stringify({
				query: "customer_movements:v1",
				filters: {},
				columns: ["fecha", "monto"],
				rows,
			}),
			documentRef: "customer_movements:v1",
			sourceType: "bigquery_structured",
			classification: "internal",
			contentHash: "h",
		},
	]);

describe("composeEvidenceText", () => {
	test("lists rows as readable lines", () => {
		const text = composeEvidenceText(
			structured([
				{ fecha: "2026-09-01", monto: 120.5 },
				{ fecha: "2026-09-02", monto: null },
			]),
		);
		expect(text).toContain("customer_movements:v1: 2 resultados");
		expect(text).toContain("1. fecha: 2026-09-01 · monto: 120.5");
		expect(text).toContain("2. fecha: 2026-09-02 · monto: —");
		expect(text).not.toContain("{");
	});

	test("says so when there are no rows", () => {
		expect(composeEvidenceText(structured([]))).toContain("sin resultados");
	});

	test("caps the rows shown and counts the rest", () => {
		const rows = Array.from({ length: 8 }, (_, i) => ({ n: i }));
		const text = composeEvidenceText(structured(rows));
		expect(text).toContain("5. n: 4");
		expect(text).not.toContain("6. n: 5");
		expect(text).toContain("… y 3 más");
	});

	test("keeps the non-causal notice of knowledge-graph evidence", () => {
		const text = composeEvidenceText(
			JSON.stringify([
				{
					content: JSON.stringify({
						notice: "Exploratory aggregate association only",
						operation: "kg.op:v1",
						filters: {},
						rows: [{ pair: "a-b", lift: 1.4 }],
					}),
					documentRef: "kg.op:v1",
				},
			]),
		);
		expect(text).toContain("pair: a-b · lift: 1.4");
		expect(text).toContain("no implica causalidad");
	});

	test("returns null for anything that is not retrieval evidence", () => {
		expect(composeEvidenceText("hola")).toBeNull();
		expect(composeEvidenceText(null)).toBeNull();
		expect(composeEvidenceText("[]")).toBeNull();
		expect(
			composeEvidenceText('[{"content":"no json","documentRef":"x"}]'),
		).toBeNull();
	});
});

const session: SessionContext = {
	sessionId: "s",
	userId: "u",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: ["dispute.read"],
	sessionVersion: 1,
	createdAt: "2026-10-05T00:00:00.000Z",
	lastSeenAt: "2026-10-05T00:00:00.000Z",
	expiresAt: "2026-10-05T01:00:00.000Z",
	revokedAt: null,
};

describe("composeEvidenceText after the real privacy stage", () => {
	test("stays readable when a long number or a date becomes a token", async () => {
		const privacy = new GenerationPrivacyService(
			new RegexContentPrivacyProvider(),
		);
		const prepared = await privacy.prepare({
			session,
			purpose: "answer_user",
			value: JSON.parse(
				structured([
					{
						product_id: "PRD-1",
						credit_limit: 98765432101.16,
						opening_date: "2024-03-15",
						current_balance: 12910708.44,
					},
				]),
			),
			traceId: "t",
		});
		// The tokens really are bare in the inner JSON: the case that broke.
		expect(prepared.content).toContain('credit_limit\\":[[PII_');

		const draft = composeEvidenceText(prepared.content);
		expect(draft).not.toBeNull();
		expect(draft).toContain("product_id: PRD-1");
		expect(draft).toContain("current_balance: 12910708.44");
		expect(draft).toContain("opening_date: 2024-03-15");
		expect(draft).not.toContain("{");

		const replaced = await privacy.replaceValidated({
			session,
			draft: draft ?? "",
			deidentified: prepared,
			traceId: "t",
		});
		expect(replaced.status).toBe("allowed");
		if (replaced.status === "allowed") {
			expect(replaced.value).not.toContain("[[PII_");
			expect(replaced.value).not.toContain("98765432101");
		}
	});
});
