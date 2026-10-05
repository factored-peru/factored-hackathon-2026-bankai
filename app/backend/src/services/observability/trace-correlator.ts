import { createHmac } from "node:crypto";

/** Maps an internal trace ID to the pseudonym that may cross the boundary. */
export type TraceCorrelator = (traceId: string) => string;

const MIN_KEY_LENGTH = 16;

/**
 * Keyed-hash correlator (ADR 0012): the same trace ID yields the same
 * pseudonym in Langfuse and BigQuery, and rotating the key deliberately cuts
 * historical correlation. The raw trace ID never leaves the process.
 */
export function createTraceCorrelator(key: string): TraceCorrelator {
	if (key.length < MIN_KEY_LENGTH) {
		throw new Error("trace_correlator_key_too_short");
	}
	return (traceId) =>
		createHmac("sha256", key).update(traceId).digest("hex").slice(0, 32);
}
