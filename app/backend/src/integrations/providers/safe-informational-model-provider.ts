import type {
	DecisionState,
	ModelDecision,
	ModelInvocation,
} from "../../domain/control/contracts.js";
import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import type { ModelProvider } from "../../services/ports/control.js";

const SAFE_INFORMATIONAL =
	"Consulté el soporte autorizado. Puedo explicar evidencia de lectura o iniciar un escalamiento humano cuando el reclamo lo requiera.";

/**
 * Demo/control_plane model stub: informational respond without Vertex.
 * Escalation paths skip this via decision-stage requiresEscalation bridge.
 */
export class SafeInformationalModelProvider implements ModelProvider {
	async decide(_input: {
		prompt: string;
		state: DecisionState;
		evidence: ModelEvidence[];
		traceId: string;
	}): Promise<ModelInvocation<ModelDecision>> {
		return {
			value: { kind: "respond", response: SAFE_INFORMATIONAL },
			usage: { inputTokens: 1, outputTokens: 1 },
		};
	}

	async composeResponse(input: {
		prompt: string;
		state: DecisionState;
		authorizedResult: unknown;
		traceId: string;
	}): Promise<ModelInvocation<string>> {
		const fromEvidence =
			typeof input.authorizedResult === "string" &&
			input.authorizedResult.length > 0
				? input.authorizedResult
				: SAFE_INFORMATIONAL;
		return {
			value: fromEvidence,
			usage: { inputTokens: 1, outputTokens: 1 },
		};
	}
}
