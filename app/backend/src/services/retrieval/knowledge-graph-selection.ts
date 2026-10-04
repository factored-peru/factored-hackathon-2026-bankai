import { z } from "zod";
import type { RagCatalog } from "./rag-catalog.js";

export const knowledgeGraphSelectionSchema = z.discriminatedUnion("decision", [
	z
		.object({
			decision: z.literal("select"),
			operationId: z.string().min(1),
			version: z.string().min(1),
			parameters: z.record(z.string(), z.unknown()),
		})
		.strict(),
	z.object({ decision: z.literal("ambiguous") }).strict(),
	z.object({ decision: z.literal("deny") }).strict(),
]);

export type KnowledgeGraphSelection = z.infer<
	typeof knowledgeGraphSelectionSchema
>;

/** The KG JEV can select only an operation that was loaded into its catalog. */
export interface KnowledgeGraphOperationSelector {
	select(input: {
		query: string;
		catalog: RagCatalog;
		traceId: string;
	}): Promise<unknown>;
}
