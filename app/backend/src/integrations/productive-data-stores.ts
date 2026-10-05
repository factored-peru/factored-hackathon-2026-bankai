/**
 * Opt-in durable stores for GCP deploy (ADR 0017 / 0020).
 * Returns null when flags are off so demo/in-memory remains the default.
 */
import { Firestore } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import type { Env } from "../config/env.js";
import type { CustomerIdentityResolver } from "../services/ports/customer-identity.js";
import type { UserProfileStore } from "../services/ports/user-profile.js";
import { CachingConversationStore } from "./cache/caching-conversation-store.js";
import { CachingCustomerIdentityResolver } from "./cache/caching-customer-identity-resolver.js";
import { FirestoreConversationStore } from "./firestore/firestore-conversation-store.js";
import { FirestoreUserProfileStore } from "./firestore/firestore-user-profile-store.js";
import { GcsAttachmentStore } from "./gcs/gcs-attachment-store.js";
import { FirestoreCustomerIdentityResolver } from "./identity/firestore-customer-identity-resolver.js";

export type ProductiveDataStores = Readonly<{
	conversationStore: CachingConversationStore;
	attachmentStore: GcsAttachmentStore;
	userProfileStore: UserProfileStore;
	customerIdentity: CustomerIdentityResolver;
}>;

/**
 * Builds Firestore conversation/user/identity + GCS attachment stores.
 * Requires FIRESTORE_ENABLED, GCS_ENABLED and GCS_UPLOAD_BUCKET.
 */
export function createProductiveDataStores(
	settings: Pick<
		Env,
		| "FIRESTORE_ENABLED"
		| "GCS_ENABLED"
		| "GCS_UPLOAD_BUCKET"
		| "GCS_UPLOAD_PREFIX"
		| "CHAT_MAX_ATTACHMENT_BYTES"
		| "GOOGLE_CLOUD_PROJECT"
	>,
	overrides: {
		firestore?: Firestore;
		storage?: Storage;
	} = {},
): ProductiveDataStores | null {
	if (
		!settings.FIRESTORE_ENABLED ||
		!settings.GCS_ENABLED ||
		settings.GCS_UPLOAD_BUCKET.trim().length === 0
	) {
		return null;
	}
	const firestore =
		overrides.firestore ??
		(settings.GOOGLE_CLOUD_PROJECT.trim().length > 0
			? new Firestore({ projectId: settings.GOOGLE_CLOUD_PROJECT.trim() })
			: new Firestore());
	const storage = overrides.storage ?? new Storage();
	return {
		conversationStore: new CachingConversationStore(
			new FirestoreConversationStore(firestore),
		),
		attachmentStore: new GcsAttachmentStore(
			storage,
			firestore,
			settings.GCS_UPLOAD_BUCKET.trim(),
			settings.GCS_UPLOAD_PREFIX,
			settings.CHAT_MAX_ATTACHMENT_BYTES,
		),
		userProfileStore: new FirestoreUserProfileStore(firestore),
		customerIdentity: new CachingCustomerIdentityResolver(
			new FirestoreCustomerIdentityResolver(firestore),
		),
	};
}
