import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

/**
 * A configured provider instance.
 *
 * Several rows may share a `kind` — two Anthropic keys, three OpenAI-compatible
 * endpoints — each with its own name, credentials and model selection.
 *
 * `apiKeyEncrypted` holds an AES-256-GCM envelope, never a plaintext key, and
 * is never selected into a response; the API returns `apiKeyHint` instead.
 */
export const aiProvider = pgTable(
	"ai_provider",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		/** User-chosen label, e.g. "Claude — production". Unique per org. */
		name: text("name").notNull(),
		/** Base provider kind: anthropic | openai | google | compatible. */
		kind: text("kind").notNull(),
		apiKeyEncrypted: text("api_key_encrypted"),
		apiKeyHint: text("api_key_hint"),
		baseUrl: text("base_url"),
		/**
		 * Models the organization has chosen to expose.
		 * `null` means "all models this provider reports" — so newly released
		 * models appear without anyone editing the configuration.
		 */
		enabledModels: jsonb("enabled_models").$type<string[] | null>(),
		/** Last successful discovery, cached so the UI need not re-fetch. */
		availableModels: jsonb("available_models").$type<
			{ id: string; label: string }[] | null
		>(),
		lastCheckedAt: timestamp("last_checked_at"),
		/** Message from the last failed check; null when the last check passed. */
		lastError: text("last_error"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("ai_provider_org_name_uidx").on(
			table.organizationId,
			table.name,
		),
		index("ai_provider_organizationId_idx").on(table.organizationId),
	],
);

/** Which provider instance and model the organization is currently using. */
export const aiSettings = pgTable("ai_settings", {
	organizationId: text("organization_id")
		.primaryKey()
		.references(() => organization.id, { onDelete: "cascade" }),
	activeProviderId: text("active_provider_id").references(() => aiProvider.id, {
		onDelete: "set null",
	}),
	activeModel: text("active_model"),
	systemPrompt: text("system_prompt"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const aiProviderRelations = relations(aiProvider, ({ one }) => ({
	organization: one(organization, {
		fields: [aiProvider.organizationId],
		references: [organization.id],
	}),
}));

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
	organization: one(organization, {
		fields: [aiSettings.organizationId],
		references: [organization.id],
	}),
	activeProvider: one(aiProvider, {
		fields: [aiSettings.activeProviderId],
		references: [aiProvider.id],
	}),
}));
