import type { KeyValueStore } from "./kv/key-value-store.js";

export interface Cache {
	isReady(): Promise<boolean>;
}

export class LocalCache implements Cache {
	async isReady(): Promise<boolean> {
		return true;
	}
}

export class KeyValueCache implements Cache {
	constructor(private readonly store: KeyValueStore) {}

	async isReady(): Promise<boolean> {
		return this.store.isReady();
	}
}
