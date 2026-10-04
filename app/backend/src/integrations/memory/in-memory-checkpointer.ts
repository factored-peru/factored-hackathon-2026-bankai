import { type BaseCheckpointSaver, MemorySaver } from "@langchain/langgraph";

/**
 * Process-local thread memory for the control-plane StateGraph. State is lost
 * on restart and is not shared between instances; it is meant for local runs
 * and tests until a Valkey-backed adapter replaces it behind the same port.
 */
export function createInMemoryCheckpointer(): BaseCheckpointSaver {
	return new MemorySaver();
}
