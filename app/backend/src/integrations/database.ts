export interface Database {
	isReady(): Promise<boolean>;
}

export class LocalDatabase implements Database {
	async isReady(): Promise<boolean> {
		return true;
	}
}

export class FirestoreDatabase implements Database {
	async isReady(): Promise<boolean> {
		// Connect the Firestore adapter here when durable persistence is enabled.
		throw new Error("Configure Firestore before enabling this adapter.");
	}
}
