import type {
	DataClassification,
	DecisionSignal,
	DecisionState,
	DisclosureResult,
	GuardrailResult,
	GuardrailSurface,
	ModelDecision,
	ModelInvocation,
	PolicyDecision,
} from "../../domain/control/contracts.js";
import type {
	KnowledgeChunk,
	ModelEvidence,
} from "../../domain/retrieval/contracts.js";
import type { SessionContext } from "../../domain/session.js";

export type GuardrailInspection = Readonly<{
	surface: GuardrailSurface;
	content: string;
	classification: DataClassification;
	traceId: string;
}>;

export interface GuardrailProvider {
	inspect(input: GuardrailInspection): Promise<GuardrailResult>;
}

export interface DecisionProjector {
	project(input: {
		message: string;
		session: SessionContext;
		evidence: KnowledgeChunk[];
	}): Promise<DecisionState>;
}

export interface DecisionModelProvider {
	decide(input: {
		prompt: string;
		state: DecisionState;
		evidence: ModelEvidence[];
		traceId: string;
	}): Promise<ModelInvocation<ModelDecision>>;
}

export interface ResponseGenerator {
	composeResponse(input: {
		prompt: string;
		state: DecisionState;
		authorizedResult: unknown;
		traceId: string;
	}): Promise<ModelInvocation<string>>;
}

/** Compatibility shape while providers migrate to the two focused ports. */
export interface ModelProvider
	extends DecisionModelProvider,
		ResponseGenerator {}

export interface DecisionSignalProvider {
	assess(input: {
		prompt: string;
		state: DecisionState;
		traceId: string;
	}): Promise<DecisionSignal | null>;
}

export interface PolicyEngine {
	evaluate(input: {
		session: SessionContext;
		state: DecisionState;
		modelDecision: ModelDecision;
		signal: DecisionSignal | null;
	}): Promise<PolicyDecision>;
}

export interface DisclosurePolicy {
	apply(input: {
		session: SessionContext;
		purpose: string;
		value: unknown;
	}): Promise<DisclosureResult>;
}

export interface IdentityVerifier {
	verify(token: string): Promise<{
		userId: string;
		tenantId: string;
		roles: string[];
		capabilities: string[];
		authStrength: string;
	}>;
}

export interface RateLimiter {
	consume(input: {
		sessionHash: string;
		tenantHash: string;
		cost: number;
	}): Promise<boolean>;
}
