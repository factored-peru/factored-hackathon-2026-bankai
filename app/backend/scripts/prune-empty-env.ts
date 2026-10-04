import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const assignment =
	/^(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)=([^\r\n]*)(?:\r?\n)?$/;

export type PruneEmptyEnvResult = Readonly<{
	content: string;
	removedEmpty: readonly string[];
	removedSuperseded: readonly string[];
}>;

/**
 * Removes assignments whose value contains no character after `=` and keeps
 * only the last non-empty assignment for each variable. Comments, blank lines,
 * CRLF formatting, and values such as `""` or whitespace are preserved.
 */
export function pruneEmptyEnvAssignments(content: string): PruneEmptyEnvResult {
	const lines = content.split(/(?<=\n)/);
	const lastNonEmpty = new Map<string, number>();
	for (const [index, line] of lines.entries()) {
		const match = assignment.exec(line);
		if (match?.[1] !== undefined && match[2] !== "") {
			lastNonEmpty.set(match[1], index);
		}
	}

	const removedEmpty: string[] = [];
	const removedSuperseded: string[] = [];
	const retained = lines.filter((line, index) => {
		const match = assignment.exec(line);
		if (match?.[1] === undefined) return true;
		if (match[2] === "") {
			removedEmpty.push(match[1]);
			return false;
		}
		if (lastNonEmpty.get(match[1]) !== index) {
			removedSuperseded.push(match[1]);
			return false;
		}
		return true;
	});
	return { content: retained.join(""), removedEmpty, removedSuperseded };
}

function main(): void {
	const envPath = resolve(process.cwd(), ".env");
	const result = pruneEmptyEnvAssignments(readFileSync(envPath, "utf8"));
	if (result.removedEmpty.length + result.removedSuperseded.length > 0)
		writeFileSync(envPath, result.content, "utf8");
	if (result.removedEmpty.length > 0)
		console.log(
			`Removed empty environment variables: ${result.removedEmpty.join(", ")}`,
		);
	if (result.removedSuperseded.length > 0)
		console.log(
			`Removed superseded environment variables: ${result.removedSuperseded.join(", ")}`,
		);
	if (result.removedEmpty.length + result.removedSuperseded.length === 0)
		console.log("No empty or superseded environment variables found.");
}

if (import.meta.main) main();
