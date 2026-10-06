import type { DecisionSignal } from "../../domain/control/contracts.js";
import type { DecisionSignalProvider } from "../../services/ports/control.js";

/**
 * Deterministic primary signal for CHAT_PIPELINE=control_plane (ADR 0004).
 * Maps Latam HITL map intents: H14 human request, H2/H8 formal claim/scam,
 * confident OOD, otherwise answerable in-domain. Not a substitute for TypeSafe JEV.
 */
export class HeuristicHitlDecisionSignalProvider
	implements DecisionSignalProvider
{
	async assess(input: {
		prompt: string;
		traceId: string;
	}): Promise<DecisionSignal> {
		const text = input.prompt.toLowerCase().normalize("NFD");
		const folded = text.replace(/\p{M}/gu, "");

		if (isConfidentOod(folded)) {
			return signal({
				domain: "out_of_domain",
				routeHint: "reject",
				requiresEscalation: false,
				allowedRoutes: ["reject"],
			});
		}

		if (isHumanRequest(folded) || isFormalClaimOrScam(folded)) {
			return signal({
				domain: "in_domain",
				routeHint: "database",
				requiresEscalation: true,
				allowedRoutes: ["database", "llm", "rag", "clarify"],
				riskLevel: "high",
			});
		}

		if (isSmallTalk(folded)) {
			return signal({
				domain: "in_domain",
				routeHint: "llm",
				requiresEscalation: false,
				allowedRoutes: ["llm"],
			});
		}

		if (isAmbiguous(folded)) {
			return signal({
				domain: "ambiguous",
				routeHint: "clarify",
				requiresEscalation: false,
				domainConfidence: 0.4,
				routeConfidence: 0.4,
				allowedRoutes: ["clarify"],
				evidenceSufficient: false,
			});
		}

		const routeHint = isLedgerRead(folded) ? "database" : "llm";
		return signal({
			domain: "in_domain",
			routeHint,
			requiresEscalation: false,
			allowedRoutes: ["llm", "database", "rag", "clarify"],
		});
	}
}

function signal(
	overrides: Partial<DecisionSignal> &
		Pick<DecisionSignal, "domain" | "routeHint" | "requiresEscalation">,
): DecisionSignal {
	return {
		provider: "heuristic-hitl-v1",
		domainConfidence: 0.99,
		routeConfidence: 0.99,
		riskLevel: "low",
		evidenceSufficient: true,
		modelVersion: "heuristic-hitl-v1",
		...overrides,
	};
}

function isHumanRequest(text: string): boolean {
	return (
		/\b(humano|asesor|agente|operador|ejecutivo|persona)\b/.test(text) ||
		/\b(hablar|pasar|pasame|pase|transfer|atender)\b.*\b(humano|asesor|agente|operador)\b/.test(
			text,
		) ||
		/\b(ombuds|defensor|condusef|indecopi|sernac|superintendencia)\b/.test(
			text,
		) ||
		/\b(atendente|humano|pessoa)\b/.test(text)
	);
}

function isFormalClaimOrScam(text: string): boolean {
	return (
		/\b(reclamar|reclamo|reclamacao|reclamação|denunciar|folio|aclaracion|aclaración)\b/.test(
			text,
		) ||
		/\b(no autorizo|nao autorizo|não autorizo|no autorice|nao autorizei)\b/.test(
			text,
		) ||
		/\b(abrir|iniciar|presentar|apresentar)\b.*\b(reclamo|disputa|reclamacao|reclamação)\b/.test(
			text,
		) ||
		/\b(me estafaron|me enganaram|ingenieria social|engenharia social|app scam)\b/.test(
			text,
		) ||
		/\b(transferi|transferí|transferi sob|me hicieron transferir)\b/.test(text)
	);
}

function isLedgerRead(text: string): boolean {
	return (
		/\b(movimiento|movimientos|transaccion|transacción|cargo|estado|extracto|saldo)\b/.test(
			text,
		) ||
		/\b(movimento|movimentos|transacao|transação|extrato)\b/.test(text) ||
		/\b(que es este|qué es este|o que e este|o que é este)\b/.test(text)
	);
}

/** Greetings and thanks are conversation, not a request that needs detail. */
function isSmallTalk(text: string): boolean {
	return /^[\s¡¿]*(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|ola|oi|bom dia|boa tarde|boa noite|gracias|muchas gracias|obrigado|obrigada|ok|vale|listo|perfecto|adios|chao|tchau)\b[\s!.,¡?¿]*$/.test(
		text,
	);
}

function isAmbiguous(text: string): boolean {
	const trimmed = text.trim();
	return trimmed.length > 0 && trimmed.length < 8 && !/\d/.test(trimmed);
}

function isConfidentOod(text: string): boolean {
	return (
		/\b(clima|tiempo|weather|futbol|fútbol|receta|chiste)\b/.test(text) ||
		/\b(como lavar dinero|como estructurar|falsificar|bypass auth|vencer visa)\b/.test(
			text,
		) ||
		/\b(sar\b|ros\b|por que me flaggearon|por qué me flaggearon)\b/.test(text)
	);
}
