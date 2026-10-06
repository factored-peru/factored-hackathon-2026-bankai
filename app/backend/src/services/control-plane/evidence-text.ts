/**
 * Turns the de-identified retrieval evidence into a readable Spanish answer.
 * It only re-orders values already present in `authorizedResult` (the output
 * of the privacy stage), so it adds no data the policy did not release.
 */
const maxRows = 5;

type EvidenceItem = Readonly<{ content: string; documentRef: string }>;
type Row = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseItems(authorizedResult: string): EvidenceItem[] | null {
	let value: unknown;
	try {
		value = JSON.parse(authorizedResult);
	} catch {
		return null;
	}
	if (!Array.isArray(value) || value.length === 0) return null;
	const items: EvidenceItem[] = [];
	for (const entry of value) {
		if (
			!isRecord(entry) ||
			typeof entry.content !== "string" ||
			typeof entry.documentRef !== "string"
		) {
			return null;
		}
		items.push({ content: entry.content, documentRef: entry.documentRef });
	}
	return items;
}

function formatRow(row: Row): string {
	return Object.entries(row)
		.map(([column, cell]) => `${column}: ${cell === null ? "—" : String(cell)}`)
		.join(" · ");
}

const bareToken = /^\[\[PII_[A-Z_]+_[0-9]+\]\](?:\.[0-9]+)?/;

/**
 * The privacy stage swaps sensitive-looking values for `[[PII_…]]` tokens. A
 * number that is replaced leaves a bare token (and maybe its decimals) where
 * JSON expects a value, so quote it. The token itself is kept: the caller
 * validates it and the privacy stage turns it into its safe value.
 */
function quoteBareTokens(json: string): string {
	let out = "";
	let inString = false;
	for (let i = 0; i < json.length; i++) {
		const char = json.charAt(i);
		if (inString) {
			out += char;
			if (char === "\\") out += json.charAt(++i);
			else if (char === '"') inString = false;
			continue;
		}
		const token = char === "[" ? bareToken.exec(json.slice(i)) : null;
		if (token !== null) {
			out += `"${token[0].replace(/\.[0-9]+$/, "")}"`;
			i += token[0].length - 1;
			continue;
		}
		if (char === '"') inString = true;
		out += char;
	}
	return out;
}

function formatItem(item: EvidenceItem): string | null {
	let body: unknown;
	try {
		body = JSON.parse(quoteBareTokens(item.content));
	} catch {
		return null;
	}
	if (!isRecord(body) || !Array.isArray(body.rows)) return null;
	const rows = body.rows.filter(isRecord);
	const count =
		rows.length === 0
			? "sin resultados"
			: `${rows.length} resultado${rows.length === 1 ? "" : "s"}`;
	const lines = [`• ${item.documentRef}: ${count}`];
	rows.slice(0, maxRows).forEach((row, index) => {
		lines.push(`  ${index + 1}. ${formatRow(row)}`);
	});
	if (rows.length > maxRows) {
		lines.push(`  … y ${rows.length - maxRows} más`);
	}
	if (typeof body.notice === "string") {
		lines.push(
			"  Nota: es una asociación agregada exploratoria; no implica causalidad ni un diagnóstico individual.",
		);
	}
	return lines.join("\n");
}

/** Null when `authorizedResult` is not retrieval evidence (caller falls back). */
export function composeEvidenceText(authorizedResult: unknown): string | null {
	if (typeof authorizedResult !== "string") return null;
	const items = parseItems(authorizedResult);
	if (items === null) return null;
	const blocks = items.map(formatItem);
	if (blocks.some((block) => block === null)) return null;
	return `Esto es lo que encontré en tus datos autorizados:\n${blocks.join("\n")}`;
}
