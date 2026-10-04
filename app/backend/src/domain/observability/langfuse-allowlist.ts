import { z } from "zod";

/** Attributes permitted on Langfuse/OTel spans (ADR 0012). No content. */
export const langfuseAllowlistedAttributeSchema = z
	.object({
		traceId: z.string().min(1),
		spanName: z.string().min(1),
		outcome: z.string().min(1),
		policyId: z.string().min(1).optional(),
		policyVersion: z.string().min(1).optional(),
		riskLevel: z.string().min(1).optional(),
		toolId: z.string().min(1).optional(),
		guardrailStatus: z
			.enum(["NO_MATCH_FOUND", "MATCH_FOUND", "FAILURE", "SKIPPED"])
			.optional(),
		latencyMs: z.number().nonnegative().optional(),
		sessionHash: z.string().min(1).optional(),
		tenantHash: z.string().min(1).optional(),
	})
	.strict();

export type LangfuseAllowlistedAttributes = z.infer<
	typeof langfuseAllowlistedAttributeSchema
>;

const FORBIDDEN_CONTENT_KEYS = [
	"prompt",
	"input",
	"output",
	"response",
	"messages",
	"content",
	"argument",
	"arguments",
	"sql",
	"chunk",
	"chunks",
	"password",
	"secret",
	"token",
	"cookie",
	"sessionId",
	"userId",
	"customerId",
	"tenantId",
] as const;

export function assertNoContentAttributes(
	attributes: Record<string, unknown>,
): void {
	for (const key of Object.keys(attributes)) {
		if (
			FORBIDDEN_CONTENT_KEYS.some(
				(forbidden) => forbidden.toLowerCase() === key.toLowerCase(),
			)
		) {
			throw new Error(`langfuse_content_attribute_forbidden:${key}`);
		}
	}
	langfuseAllowlistedAttributeSchema.parse(attributes);
}
