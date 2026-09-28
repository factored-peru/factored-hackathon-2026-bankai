import type {
	AgentBudget,
	ClarificationQuestionKey,
	DecisionSignal,
	DecisionState,
	ModelDecision,
	PolicyDecision,
} from "../../domain/control/contracts.js";
import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { ProposedToolCall } from "../../domain/tools/contracts.js";
import type { DeidentifiedContent } from "../ports/privacy.js";

export type AgentRequest = Readonly<{
	sessionId: string;
	message: string;
	traceId: string;
	threadId: string;
	allowedSources: string[];
	budget: AgentBudget;
}>;

export type NormalizedRoute =
	| Readonly<{ route: "llm"; legacyResponse?: string }>
	| Readonly<{ route: "rag"; query: string }>
	| Readonly<{ route: "database"; call: ProposedToolCall }>
	| Readonly<{ route: "reject"; reasonCode: string }>
	| Readonly<{ route: "clarify"; question: ClarificationQuestionKey }>
	| Readonly<{ route: "out_of_domain"; responseKey: string }>;

export type InputStageContext = Readonly<{
	request: AgentRequest;
	session: SessionContext;
	prompt: DeidentifiedContent;
	state: DecisionState;
}>;

export type DecisionStageContext = InputStageContext &
	Readonly<{
		signal: DecisionSignal | null;
		modelDecision: ModelDecision;
		route: NormalizedRoute;
	}>;

export type AuthorizedDecisionContext = DecisionStageContext &
	Readonly<{
		policy: PolicyDecision;
	}>;

export type RoutePayload =
	| Readonly<{ kind: "llm" }>
	| Readonly<{ kind: "legacy_response"; response: string }>
	| Readonly<{ kind: "rag"; evidence: ModelEvidence[] }>
	| Readonly<{ kind: "database"; value: unknown }>
	| Readonly<{ kind: "out_of_domain"; responseKey: string }>;

export type RouteExecutionResult =
	| Readonly<{ status: "ready"; payload: RoutePayload }>
	| Readonly<{
			status: "pending_clarification";
			workflowId: string;
			clarificationId: string;
			question: string;
	  }>
	| Readonly<{ status: "denied" | "failed"; reasonCode: string }>;

export type StageFailure = Readonly<{
	status: "failed";
	reasonCode: string;
}>;

export type InputStageResult = InputStageContext | StageFailure;
export type DecisionStageResult = DecisionStageContext | StageFailure;

export type PolicyStageResult =
	| Readonly<{ status: "ready"; context: AuthorizedDecisionContext }>
	| Readonly<{
			status: "denied";
			decisionId: string;
			reasonCode: string;
			policy: PolicyDecision;
	  }>
	| Readonly<{
			status: "pending_approval";
			decisionId: string;
			workflowId: string;
			approvalId: string;
			policy: PolicyDecision;
	  }>
	| StageFailure;

export type ResponseStageResult =
	| Readonly<{
			status: "completed";
			response: string;
			decisionId: string;
	  }>
	| StageFailure;
