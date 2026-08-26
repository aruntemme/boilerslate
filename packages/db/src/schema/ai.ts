import { relations } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

/**
 * Per-organization AI provider configuration.
 *
 * `apiKeyEncrypted` holds an AES-256-GCM envelope, never a plaintext key, and
 * is never selected into any response — the API returns `apiKeyHint` instead.
 * One row per (organization, provider).
 */
export const aiProviderConfig = pgTable(
	"ai_provider_config",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		/** Matches a ProviderId in @boilerslate/ai. */
		provider: text("provider").notNull(),
		apiKeyEncrypted: text("api_key_encrypted"),
		/** Masked form shown in the UI, e.g. "sk-…4f2a". Safe to return. */
		apiKeyHint: text("api_key_hint"),
		/** Required for OpenAI-compatible endpoints (Ollama, vLLM, gateways). */
		baseUrl: text("base_url"),
		/** Model used when this provider is selected. */
		defaultModel: text("default_model"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("ai_provider_config_org_provider_uidx").on(
			table.organizationId,
			table.provider,
		),
		index("ai_provider_config_organizationId_idx").on(table.organizationId),
	],
);

/**
 * Which provider and model an organization is currently using.
 * Separate from the credential rows so switching model does not touch secrets.
 */
export const aiSettings = pgTable("ai_settings", {
	organizationId: text("organization_id")
		.primaryKey()
		.references(() => organization.id, { onDelete: "cascade" }),
	activeProvider: text("active_provider"),
	activeModel: text("active_model"),
	systemPrompt: text("system_prompt"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const aiProviderConfigRelations = relations(
	aiProviderConfig,
	({ one }) => ({
		organization: one(organization, {
			fields: [aiProviderConfig.organizationId],
			references: [organization.id],
		}),
	}),
);

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
	organization: one(organization, {
		fields: [aiSettings.organizationId],
		references: [organization.id],
	}),
}));
