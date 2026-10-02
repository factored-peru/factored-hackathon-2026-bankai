import { z } from "zod";
import { dataClassificationSchema } from "../control/contracts.js";

export const knowledgeChunkSchema = z
	.object({
		content: z.string().min(1),
		tenantId: z.string().min(1),
		documentId: z.string().min(1),
		sourceId: z.string().min(1),
		sourceType: z.string().min(1),
		documentVersion: z.string().min(1),
		classification: dataClassificationSchema,
		createdAt: z.string().datetime(),
		contentHash: z.string().min(1),
	})
	.strict();
export type KnowledgeChunk = z.infer<typeof knowledgeChunkSchema>;

/** Projection safe for a model boundary; tenant and storage coordinates stay local. */
export type ModelEvidence = Readonly<{
	content: string;
	documentRef: string;
	sourceType: string;
	classification: z.infer<typeof dataClassificationSchema>;
	contentHash: string;
}>;

export type RetrievalQuery = Readonly<{
	query: string;
	tenantId: string;
	maxChunks: number;
	allowedSources: string[];
}>;

export type RetrievalResult =
	| Readonly<{ status: "succeeded"; chunks: KnowledgeChunk[] }>
	| Readonly<{ status: "blocked" | "failed"; reasonCode: string }>;
