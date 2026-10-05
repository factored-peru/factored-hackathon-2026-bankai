import { describe, expect, test } from "bun:test";
import { createProductiveDataStores } from "../src/integrations/productive-data-stores.js";

describe("createProductiveDataStores", () => {
	test("stays null until Firestore + GCS upload bucket are enabled", () => {
		expect(
			createProductiveDataStores({
				FIRESTORE_ENABLED: false,
				GCS_ENABLED: true,
				GCS_UPLOAD_BUCKET: "uploads",
				GCS_UPLOAD_PREFIX: "conversation-uploads/",
				CHAT_MAX_ATTACHMENT_BYTES: 1024,
				GOOGLE_CLOUD_PROJECT: "factored-hackathon",
			}),
		).toBeNull();
		expect(
			createProductiveDataStores({
				FIRESTORE_ENABLED: true,
				GCS_ENABLED: true,
				GCS_UPLOAD_BUCKET: "",
				GCS_UPLOAD_PREFIX: "conversation-uploads/",
				CHAT_MAX_ATTACHMENT_BYTES: 1024,
				GOOGLE_CLOUD_PROJECT: "factored-hackathon",
			}),
		).toBeNull();
	});

	test("builds durable stores when productive flags are on", () => {
		const firestore = {
			collection: () => ({
				doc: () => ({ get: async () => ({ exists: false }) }),
			}),
		};
		const storage = { bucket: () => ({}) };
		const stores = createProductiveDataStores(
			{
				FIRESTORE_ENABLED: true,
				GCS_ENABLED: true,
				GCS_UPLOAD_BUCKET: "uploads",
				GCS_UPLOAD_PREFIX: "conversation-uploads/",
				CHAT_MAX_ATTACHMENT_BYTES: 1024,
				GOOGLE_CLOUD_PROJECT: "factored-hackathon",
			},
			{ firestore: firestore as never, storage: storage as never },
		);
		expect(stores).not.toBeNull();
		expect(stores?.conversationStore).toBeDefined();
		expect(stores?.attachmentStore).toBeDefined();
		expect(stores?.userProfileStore).toBeDefined();
		expect(stores?.customerIdentity).toBeDefined();
	});
});
