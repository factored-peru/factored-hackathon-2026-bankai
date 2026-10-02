import type { Item } from "../domain/items.js";
import type { ItemStore } from "../services/ports/items.js";

export class MemoryItemStore implements ItemStore {
	readonly #items = new Map<string, Item>();

	async isReady(): Promise<boolean> {
		return true;
	}

	async save(item: Item): Promise<Item> {
		this.#items.set(item.id, item);
		return item;
	}

	async get(id: string): Promise<Item | undefined> {
		return this.#items.get(id);
	}
}
