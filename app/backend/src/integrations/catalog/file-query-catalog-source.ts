import { readFile } from "node:fs/promises";
import type { QueryCatalogSource } from "../../services/ports/retrieval.js";

/** Reads the versioned JSON catalog from a path fixed by configuration. */
export class FileQueryCatalogSource implements QueryCatalogSource {
	constructor(private readonly path: string) {}

	async read(): Promise<unknown> {
		return JSON.parse(await readFile(this.path, "utf8"));
	}
}
