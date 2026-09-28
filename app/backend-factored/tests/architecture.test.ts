import { describe, expect, test } from "bun:test";

function sourceFiles(pattern: string): string[] {
	return [...new Bun.Glob(pattern).scanSync({ cwd: process.cwd() })];
}

describe("layer dependencies", () => {
	test("domain does not import outer layers", async () => {
		for (const file of sourceFiles("src/domain/**/*.ts")) {
			const source = await Bun.file(file).text();
			expect(source).not.toMatch(
				/from\s+["'][^"']*(?:services|integrations|http)\//,
			);
		}
	});

	test("services do not import HTTP or concrete integrations", async () => {
		for (const file of sourceFiles("src/services/**/*.ts")) {
			const source = await Bun.file(file).text();
			expect(source).not.toMatch(/from\s+["'][^"']*(?:integrations|http)\//);
		}
	});
});
