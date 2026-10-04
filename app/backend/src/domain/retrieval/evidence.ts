import { z } from "zod";
import { dataClassificationSchema } from "../control/contracts.js";

const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Sanitized result of a closed retrieval (ADR 0011): origin, version, filters,
 * relations and metrics. It carries no SQL, table coordinates, tenant or
 * customer identifiers; `scope` only states how the result was bounded.
 */
export const evidenceDtoSchema = z
	.object({
		source: z
			.object({
				kind: z.enum(["structured", "knowledge_graph"]),
				queryId: z.string().min(1),
				queryVersion: z.string().min(1),
				catalogVersion: z.string().min(1),
				jobId: z.string().min(1).nullable(),
			})
			.strict(),
		scope: z.enum(["self", "tenant"]),
		/** Caller-supplied parameters actually applied; never session values. */
		filters: z.record(
			z.string(),
			z.union([z.string(), z.number(), z.boolean()]),
		),
		columns: z.array(
			z
				.object({
					name: z.string().min(1),
					type: z.string().min(1),
					classification: dataClassificationSchema,
				})
				.strict(),
		),
		rows: z.array(z.record(z.string(), scalarSchema)),
		relations: z.array(
			z
				.object({
					column: z.string().min(1),
					references: z.string().min(1),
				})
				.strict(),
		),
		metrics: z
			.object({
				rowCount: z.number().int().min(0),
				truncated: z.boolean(),
				bytesProcessed: z.number().int().min(0).nullable(),
				durationMs: z.number().min(0).nullable(),
			})
			.strict(),
		retrievedAt: z.string().datetime(),
	})
	.strict()
	.superRefine((evidence, context) => {
		if (evidence.metrics.rowCount !== evidence.rows.length) {
			context.addIssue({
				code: "custom",
				path: ["metrics", "rowCount"],
				message: "rowCount must equal the number of rows",
			});
		}
		const names = new Set(evidence.columns.map((column) => column.name));
		for (const [index, row] of evidence.rows.entries()) {
			if (Object.keys(row).some((key) => !names.has(key))) {
				context.addIssue({
					code: "custom",
					path: ["rows", index],
					message: "Row contains a column that is not declared",
				});
			}
		}
	});
export type EvidenceDTO = z.infer<typeof evidenceDtoSchema>;
