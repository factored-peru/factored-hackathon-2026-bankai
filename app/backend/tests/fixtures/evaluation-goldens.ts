import type {
	EvaluationContext,
	EvaluationRoute,
	EvaluationStep,
} from "../../src/services/evaluation/contracts.js";
import { knowledgeGraphQuestionGoldens } from "./kg-question-goldens.js";

type Overrides = Partial<
	Omit<
		EvaluationContext,
		| "fixtureId"
		| "traceId"
		| "route"
		| "expectedRoute"
		| "trajectory"
		| "expectedTrajectory"
	>
>;

const trajectories: Record<EvaluationRoute, readonly EvaluationStep[]> = {
	llm: [
		{ name: "primary_jev", route: "llm" },
		{ name: "policy", route: "policy" },
		{ name: "response", route: "llm" },
	],
	structured_rag: [
		{ name: "primary_jev", route: "structured_rag" },
		{ name: "structured_catalog", route: "structured_rag" },
		{ name: "structured_jev", route: "structured_rag" },
		{ name: "policy", route: "policy" },
		{ name: "structured_rag", route: "structured_rag" },
	],
	kg_rag: [
		{ name: "primary_jev", route: "kg_rag" },
		{ name: "kg_catalog", route: "kg_rag" },
		{ name: "kg_jev", route: "kg_rag" },
		{ name: "policy", route: "policy" },
		{ name: "kg_rag", route: "kg_rag" },
	],
	ood: [{ name: "primary_jev", route: "ood" }],
};

function fixture(
	fixtureId: string,
	route: EvaluationRoute,
	overrides: Overrides = {},
): EvaluationContext {
	return {
		traceId: `synthetic-${fixtureId}`,
		fixtureId,
		route,
		expectedRoute: route,
		trajectory: trajectories[route],
		expectedTrajectory: trajectories[route],
		policyAllowed: true,
		budgetExceeded: false,
		evidenceVersion: route === "llm" || route === "ood" ? null : "v1",
		catalogLoaded: route === "structured_rag" || route === "kg_rag",
		catalogLoadedBeforeSpecializedJev: route !== "kg_rag" || true,
		tenantIsolated: true,
		guardrailPassed: true,
		responseContainsSensitiveContent: false,
		resultVerified: true,
		policyVersion: "synthetic-v1",
		catalogVersion:
			route === "structured_rag" || route === "kg_rag" ? "v1" : null,
		...overrides,
	};
}

export const evaluationGoldens: readonly EvaluationContext[] = [
	...(["llm", "structured_rag", "kg_rag", "ood"] as const).flatMap((route) =>
		["es", "pt", "code-switch"].map((language) =>
			fixture(`route-${route}-${language}`, route),
		),
	),
	...[
		"clarify-low-confidence",
		"clarify-ambiguous",
		"policy-deny",
		"hitl-required",
		"hitl-expired",
		"tool-denied",
		"unsupported-action",
		"ood-safe-answer",
	].map((id) =>
		fixture(id, "ood", { resultVerified: id === "ood-safe-answer" }),
	),
	...knowledgeGraphQuestionGoldens.map((golden) =>
		fixture(golden.fixtureId, "kg_rag", {
			kgSelectionMatchesFixture: true,
		}),
	),
	...[
		"catalog-missing",
		"query-not-allowlisted",
		"tenant-mismatch",
		"budget-exceeded",
		"evidence-missing",
		"timeout",
		"schema-invalid",
		"injection",
		"cross-tenant",
		"provider-failure",
	].map((id) =>
		fixture(id, "structured_rag", {
			catalogLoaded: !["catalog-missing", "provider-failure"].includes(id),
			evidenceVersion: ["evidence-missing", "provider-failure"].includes(id)
				? null
				: "v1",
			budgetExceeded: id === "budget-exceeded" || id === "timeout",
			tenantIsolated: id !== "tenant-mismatch" && id !== "cross-tenant",
			guardrailPassed: id !== "injection",
		}),
	),
	...[
		"catalog-missing",
		"catalog-order-invalid",
		"operation-not-allowlisted",
		"manifest-invalid",
		"checksum-invalid",
		"graph-schema-invalid",
		"evidence-missing",
		"timeout",
		"cross-tenant",
		"provider-failure",
	].map((id) =>
		fixture(id, "kg_rag", {
			catalogLoaded: id !== "catalog-missing" && id !== "provider-failure",
			catalogLoadedBeforeSpecializedJev: id !== "catalog-order-invalid",
			evidenceVersion: ["evidence-missing", "provider-failure"].includes(id)
				? null
				: "v1",
			tenantIsolated: id !== "cross-tenant",
			budgetExceeded: id === "timeout",
		}),
	),
	...[
		"prompt-injection",
		"jailbreak",
		"pii-output",
		"secret-output",
		"provider-down",
		"rate-limit",
		"es-pt-ambiguity",
		"unverified-action",
	].map((id) =>
		fixture(id, "llm", {
			guardrailPassed: id !== "es-pt-ambiguity" && id !== "provider-down",
			responseContainsSensitiveContent:
				id === "pii-output" || id === "secret-output",
			resultVerified: id !== "unverified-action",
			budgetExceeded: id === "rate-limit",
		}),
	),
];
