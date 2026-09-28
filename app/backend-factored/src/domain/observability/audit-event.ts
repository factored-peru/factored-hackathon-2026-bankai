import { z } from "zod";
import { riskLevelSchema } from "../control/contracts.js";

export const safeAuditEventSchema = z
	.object({
		event: z.string().min(1),
		traceId: z.string().min(1),
		workflowId: z.string().min(1).nullable(),
		decisionId: z.string().min(1).nullable(),
		policyId: z.string().min(1).nullable(),
		policyVersion: z.string().min(1).nullable(),
		toolId: z.string().min(1).nullable(),
		toolVersion: z.string().min(1).nullable(),
		guardrailProvider: z.string().min(1).nullable(),
		guardrailStatus: z
			.enum(["NO_MATCH_FOUND", "MATCH_FOUND", "FAILURE", "SKIPPED"])
			.nullable(),
		templateVersion: z.string().min(1).nullable(),
		riskLevel: riskLevelSchema.nullable(),
		jevProvider: z.string().min(1).nullable().optional(),
		jevModelVersion: z.string().min(1).nullable().optional(),
		domainDecision: z
			.enum(["in_domain", "out_of_domain", "ambiguous"])
			.nullable()
			.optional(),
		domainConfidence: z.number().min(0).max(1).nullable().optional(),
		routeHint: z
			.enum(["llm", "rag", "database", "clarify", "reject"])
			.nullable()
			.optional(),
		routeConfidence: z.number().min(0).max(1).nullable().optional(),
		sessionHash: z.string().min(1),
		tenantHash: z.string().min(1),
		outcome: z.string().min(1),
		occurredAt: z.string().datetime(),
	})
	.strict();

export type SafeAuditEvent = z.infer<typeof safeAuditEventSchema>;
