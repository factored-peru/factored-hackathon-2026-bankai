import type {
	PrivateDataBroker,
	ResolveHandleInput,
	SessionStore,
} from "../domain/session.js";

export type ResolvePrivateToolInput = Omit<ResolveHandleInput, "session"> & {
	sessionId: string;
};

export class PrivateToolResolutionService {
	constructor(
		private readonly sessionStore: SessionStore,
		private readonly privateDataBroker: PrivateDataBroker,
	) {}

	async resolve(input: ResolvePrivateToolInput): Promise<unknown> {
		const session = await this.sessionStore.get(input.sessionId);
		if (!session) {
			throw new Error(
				"Cannot resolve a private tool call without a valid session",
			);
		}

		return this.privateDataBroker.resolveHandle({
			session,
			handle: input.handle,
			toolId: input.toolId,
			audience: input.audience,
			purpose: input.purpose,
		});
	}
}
