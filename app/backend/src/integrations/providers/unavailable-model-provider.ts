import type {
	DecisionSignalProvider,
	ModelProvider,
} from "../../services/ports/control.js";

/** Domain routing is required before the model router can select a branch. */
export class DisabledDecisionSignalProvider implements DecisionSignalProvider {
	async assess(): Promise<null> {
		return null;
	}
}

/** A required model dependency fails explicitly when it is not configured. */
export class UnavailableModelProvider implements ModelProvider {
	async decide(): Promise<never> {
		throw new Error("Model provider is unavailable");
	}

	async composeResponse(): Promise<never> {
		throw new Error("Model provider is unavailable");
	}
}
