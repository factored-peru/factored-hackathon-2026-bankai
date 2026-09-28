import { z } from "zod";
import { proposedToolCallSchema } from "../tools/contracts.js";

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const dataClassificationSchema = z.enum([
	"public",
	"internal",
	"personal",
	"financial",
	"secret",
]);
export type DataClassification = z.infer<typeof dataClassificationSchema>;

export const clarificationQuestionKeySchema = z.enum([
	"clarify_domain",
	"clarify_account",
	"clarify_period",
]);
export type ClarificationQuestionKey = z.infer<
	typeof clarificationQuestionKeySchema
>;

export const decisionRouteKindSchema = z.enum([
	"llm",
	"rag",
	"database",
	"reject",
	"clarify",
	"out_of_domain",
]);
export type DecisionRouteKind = z.infer<typeof decisionRouteKindSchema>;

export const guardrailSurfaceSchema = z.enum([
	"user_input",
	"retrieved_content",
	"model_output",
	"final_response",
]);
export type GuardrailSurface = z.infer<typeof guardrailSurfaceSchema>;

export const guardrailResultSchema = z
	.object({
		provider: z.string().min(1),
		status: z.enum(["NO_MATCH_FOUND", "MATCH_FOUND", "FAILURE", "SKIPPED"]),
		action: z.enum(["allow", "block", "escalate"]),
		templateVersion: z.string().min(1),
		traceId: z.string().min(1),
	})
	.strict();
export type GuardrailResult = z.infer<typeof guardrailResultSchema>;

export const decisionStateSchema = z
	.object({
		intent: z.string().min(1),
		actorRole: z.string().min(1),
		tenantScope: z.enum(["self", "tenant", "global"]),
		requestedTool: z.string().min(1).nullable(),
		riskLevel: riskLevelSchema,
		policyFlags: z.array(z.string().min(1)),
		accountVerified: z.boolean(),
		amountBucket: z.string().min(1).nullable(),
		evidenceQuality: z.enum(["none", "low", "medium", "high"]),
		opaqueHandles: z.array(z.string().min(1)),
		provenance: z.array(z.string().min(1)),
	})
	.strict();
export type DecisionState = z.infer<typeof decisionStateSchema>;

export const modelDecisionSchema = z.union([
	z
		.object({ kind: z.literal("respond"), response: z.string().min(1) })
		.strict(),
	z.object({ kind: z.literal("tool"), call: proposedToolCallSchema }).strict(),
	z
		.object({
			kind: z.literal("route"),
			route: z.literal("llm"),
		})
		.strict(),
	z
		.object({
			kind: z.literal("route"),
			route: z.literal("rag"),
			query: z.string().min(1),
		})
		.strict(),
	z
		.object({
			kind: z.literal("route"),
			route: z.literal("database"),
			call: proposedToolCallSchema,
		})
		.strict(),
	z
		.object({
			kind: z.literal("route"),
			route: z.literal("reject"),
			reasonCode: z.string().min(1),
		})
		.strict(),
	z
		.object({
			kind: z.literal("route"),
			route: z.literal("clarify"),
			question: clarificationQuestionKeySchema,
		})
		.strict(),
	z
		.object({
			kind: z.literal("route"),
			route: z.literal("out_of_domain"),
			responseKey: z.string().min(1),
		})
		.strict(),
]);
export type ModelDecision = z.infer<typeof modelDecisionSchema>;
export type RoutedModelDecision = Extract<ModelDecision, { kind: "route" }>;

export const modelUsageSchema = z
	.object({
		inputTokens: z.number().int().nonnegative(),
		outputTokens: z.number().int().nonnegative(),
	})
	.strict();
export type ModelUsage = z.infer<typeof modelUsageSchema>;

export type ModelInvocation<T> = Readonly<{
	value: T;
	usage: ModelUsage;
}>;

export const decisionSignalSchema = z
	.object({
		provider: z.string().min(1),
		domain: z.enum(["in_domain", "out_of_domain", "ambiguous"]),
		routeHint: z.enum(["llm", "rag", "database", "clarify", "reject"]),
		allowedRoutes: z.array(decisionRouteKindSchema).min(1).optional(),
		domainConfidence: z.number().min(0).max(1),
		routeConfidence: z.number().min(0).max(1),
		riskLevel: riskLevelSchema,
		evidenceSufficient: z.boolean(),
		requiresEscalation: z.boolean(),
		modelVersion: z.string().min(1),
	})
	.strict();
export type DecisionSignal = z.infer<typeof decisionSignalSchema>;

export const policyDecisionSchema = z
	.object({
		outcome: z.enum(["ALLOW", "DENY", "REQUIRE_APPROVAL"]),
		decisionId: z.string().min(1),
		policyId: z.string().min(1),
		policyVersion: z.string().min(1),
		riskLevel: riskLevelSchema,
		reasons: z.array(z.string().min(1)),
	})
	.strict();
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;

export const disclosureResultSchema = z.discriminatedUnion("action", [
	z
		.object({
			action: z.literal("allow"),
			value: z.unknown(),
			reasonCode: z.string().min(1),
		})
		.strict(),
	z
		.object({
			action: z.literal("mask"),
			value: z.unknown(),
			reasonCode: z.string().min(1),
		})
		.strict(),
	z
		.object({ action: z.literal("omit"), reasonCode: z.string().min(1) })
		.strict(),
	z
		.object({ action: z.literal("deny"), reasonCode: z.string().min(1) })
		.strict(),
]);
export type DisclosureResult = z.infer<typeof disclosureResultSchema>;

export const defaultAgentBudget = {
	maxSteps: 12,
	maxToolCalls: 6,
	maxLlmCalls: 8,
	maxRetriesPerNode: 2,
	maxWallTimeMs: 30_000,
	maxRetrievedChunks: 8,
	maxInputTokens: 0,
	maxOutputTokens: 0,
} as const;

export type AgentBudget = Readonly<{
	maxSteps: number;
	maxToolCalls: number;
	maxLlmCalls: number;
	maxRetriesPerNode: number;
	maxWallTimeMs: number;
	maxRetrievedChunks: number;
	maxInputTokens: number;
	maxOutputTokens: number;
}>;

export type AgentRunResult =
	| Readonly<{ status: "completed"; response: string; decisionId: string }>
	| Readonly<{
			status: "denied";
			decisionId: string;
			reasonCode: string;
	  }>
	| Readonly<{
			status: "pending_approval";
			decisionId: string;
			workflowId: string;
			approvalId: string;
	  }>
	| Readonly<{
			status: "pending_clarification";
			decisionId: string;
			workflowId: string;
			clarificationId: string;
			question: string;
	  }>
	| Readonly<{ status: "failed"; reasonCode: string }>;
