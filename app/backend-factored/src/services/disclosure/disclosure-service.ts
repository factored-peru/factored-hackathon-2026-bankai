import { disclosureResultSchema } from "../../domain/control/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { DisclosurePolicy } from "../ports/control.js";

export type AuthorizedDisclosure =
	| Readonly<{ status: "allowed"; value: unknown }>
	| Readonly<{ status: "blocked"; reasonCode: string }>;

export class DisclosureService {
	constructor(private readonly policy: DisclosurePolicy) {}

	async authorize(input: {
		session: SessionContext;
		purpose: string;
		value: unknown;
	}): Promise<AuthorizedDisclosure> {
		const decision = disclosureResultSchema.parse(
			await this.policy.apply(input),
		);
		if (!("value" in decision)) {
			return { status: "blocked", reasonCode: decision.reasonCode };
		}
		return { status: "allowed", value: decision.value };
	}
}
