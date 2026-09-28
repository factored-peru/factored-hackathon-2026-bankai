import { describe, expect, test } from "bun:test";

async function runMatrix(...args: string[]): Promise<{
	output: string;
	exitCode: number;
}> {
	const child = Bun.spawn(["bun", "scripts/agent-matrix.ts", ...args], {
		stderr: "pipe",
		stdout: "pipe",
	});
	const [output, errorOutput] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	const exitCode = await child.exited;
	return { output: `${output}${errorOutput}`, exitCode };
}

describe("agent behavior matrix CLI", () => {
	test("prints a vertical trace for a database scenario", async () => {
		const result = await runMatrix(
			"--scenario",
			"authorized-database",
			"--plain",
		);

		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("[01] ENTRADA");
		expect(result.output).toContain("SESIÓN SERVER-SIDE");
		expect(result.output).toContain("filter_match_state: NO_MATCH_FOUND");
		expect(result.output).toContain("invocation_result: SUCCESS");
		expect(result.output).toContain("RESOLUCIÓN TARDÍA DE DATOS PRIVADOS");
		expect(result.output).toContain("REEMPLAZO VALIDADO");
		expect(result.output).toContain("RESUMEN: 1/1 escenarios PASS");
	});

	test("keeps JSON output minimized", async () => {
		const result = await runMatrix(
			"--scenario",
			"authorized-database",
			"--json",
		);

		expect(result.exitCode).toBe(0);
		expect(result.output).not.toContain("ana@example.test");
		expect(result.output).not.toContain("handle-account");
		expect(result.output).toContain('"terminalStage": "response"');
		expect(result.output).toContain('"pass": true');
	});
});
