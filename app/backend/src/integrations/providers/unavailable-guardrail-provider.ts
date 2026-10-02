import type { GuardrailProvider } from "../../services/ports/control.js";

/** A disabled required guardrail fails closed; it never fabricates ALLOW. */
export class UnavailableGuardrailProvider implements GuardrailProvider {
	constructor(private readonly providerName: string) {}

	async inspect(input: Parameters<GuardrailProvider["inspect"]>[0]) {
		return {
			provider: this.providerName,
			status: "FAILURE" as const,
			action: "block" as const,
			templateVersion: "unavailable",
			traceId: input.traceId,
		};
	}
}
