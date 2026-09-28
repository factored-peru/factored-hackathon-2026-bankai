import type { Item } from "../../domain/items.js";

export interface ItemStore {
	isReady(): Promise<boolean>;
	save(item: Item): Promise<Item>;
	get(id: string): Promise<Item | undefined>;
}
