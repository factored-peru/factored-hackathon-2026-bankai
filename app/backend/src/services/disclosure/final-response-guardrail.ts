import type { GuardrailProvider } from "../ports/control.js";

export type FinalResponseGuardrailResult =
	| Readonly<{ status: "allowed"; value: string }>
	| Readonly<{ status: "blocked"; reasonCode: string }>;

export class FinalResponseGuardrail {
	constructor(private readonly guardrail: GuardrailProvider) {}

	async sanitize(
		response: string,
		traceId: string,
	): Promise<FinalResponseGuardrailResult> {
		const inspection = await this.guardrail.inspect({
			surface: "final_response",
			content: response,
			classification: "personal",
			traceId,
		});
		if (
			inspection.status !== "NO_MATCH_FOUND" ||
			inspection.action !== "allow"
		) {
			return {
				status: "blocked",
				reasonCode: `final_guardrail_${inspection.status.toLowerCase()}`,
			};
		}
		return { status: "allowed", value: response };
	}
}
