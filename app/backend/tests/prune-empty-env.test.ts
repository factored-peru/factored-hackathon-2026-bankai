import { describe, expect, test } from "bun:test";
import { pruneEmptyEnvAssignments } from "../scripts/prune-empty-env.js";

describe("pruneEmptyEnvAssignments", () => {
	test("removes only assignments with no content after equals", () => {
		const result = pruneEmptyEnvAssignments(
			'# local settings\r\nEMPTY=\r\nexport ALSO_EMPTY=\r\nVALUE=enabled\r\nQUOTED=""\r\nSPACES=  \r\n\r\n',
		);

		expect(result).toEqual({
			content:
				'# local settings\r\nVALUE=enabled\r\nQUOTED=""\r\nSPACES=  \r\n\r\n',
			removedEmpty: ["EMPTY", "ALSO_EMPTY"],
			removedSuperseded: [],
		});
	});

	test("keeps the last non-empty occurrence of a variable", () => {
		const result = pruneEmptyEnvAssignments(
			"VALUE=old\nexport VALUE=new\nVALUE=latest\nOTHER=kept\n",
		);

		expect(result).toEqual({
			content: "VALUE=latest\nOTHER=kept\n",
			removedEmpty: [],
			removedSuperseded: ["VALUE", "VALUE"],
		});
	});
});
