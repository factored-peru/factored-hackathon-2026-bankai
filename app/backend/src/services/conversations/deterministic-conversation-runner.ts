import type { ConversationRunner } from "../ports/conversation.js";

/** Development-only stream. A real provider must retain the same event contract. */
export const deterministicConversationRunner: ConversationRunner = async (
	input,
) => {
	const response =
		input.message.trim().length === 0
			? "Recibí tus adjuntos. Un operador los revisará antes de usarlos como evidencia."
			: "Estoy revisando tu consulta de soporte. Esta sesión demo conserva el estado y la trazabilidad de forma segura.";
	for (const token of response.split(/(\s+)/)) await input.onDelta(token);
	return { status: "completed", response };
};
