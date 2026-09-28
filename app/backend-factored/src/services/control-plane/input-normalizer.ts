const encodedPayloadPattern =
	/(?:[A-Za-z0-9+/]{80,}={0,2}|(?:%[0-9A-Fa-f]{2}){8,})/;

export const maxUserMessageCharacters = 16_000;

export type NormalizedInput =
	| Readonly<{ status: "accepted"; content: string }>
	| Readonly<{ status: "rejected"; reasonCode: string }>;

export function normalizeUserMessage(message: string): NormalizedInput {
	if (message.length === 0) {
		return { status: "rejected", reasonCode: "empty_message" };
	}
	if (message.length > maxUserMessageCharacters) {
		return { status: "rejected", reasonCode: "message_too_large" };
	}
	for (const character of message) {
		const codePoint = character.codePointAt(0) ?? 0;
		if (
			codePoint < 32 &&
			codePoint !== 9 &&
			codePoint !== 10 &&
			codePoint !== 13
		) {
			return { status: "rejected", reasonCode: "invalid_control_character" };
		}
	}
	const normalized = message.normalize("NFKC");
	if (encodedPayloadPattern.test(normalized)) {
		return { status: "rejected", reasonCode: "encoded_content_not_supported" };
	}
	return { status: "accepted", content: normalized };
}
