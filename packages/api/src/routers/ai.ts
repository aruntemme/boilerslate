/**
 * AI provider configuration.
 *
 * Every procedure here is organization-scoped. API keys are accepted,
 * encrypted and stored — but never returned. `list` returns a masked hint so
 * the UI can show which key is configured without ever holding the secret.
 */
import {
	DEFAULT_MODEL,
	DEFAULT_PROVIDER,
	encryptSecret,
	getProvider,
	isProviderId,
	maskSecret,
	PROVIDERS,
	resolveCredentials,
} from "@boilerslate/ai";
import { db } from "@boilerslate/db";
import { aiProviderConfig, aiSettings } from "@boilerslate/db/schema/ai";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { organizationProcedure } from "../index";

const providerIdSchema = z.string().refine(isProviderId, {
	message: "Unknown provider.",
});

export const aiRouter = {
	/** The catalog plus, per provider, whether it is usable and how. */
	listProviders: organizationProcedure.handler(async ({ context }) => {
		const rows = await db
			.select({
				provider: aiProviderConfig.provider,
				apiKeyHint: aiProviderConfig.apiKeyHint,
				baseUrl: aiProviderConfig.baseUrl,
				defaultModel: aiProviderConfig.defaultModel,
				// apiKeyEncrypted is deliberately not selected.
			})
			.from(aiProviderConfig)
			.where(eq(aiProviderConfig.organizationId, context.organizationId));

		const stored = new Map(rows.map((r) => [r.provider, r]));

		return PROVIDERS.map((info) => {
			const row = stored.get(info.id);
			const hasStoredKey = Boolean(row?.apiKeyHint);
			// resolveCredentials also consults the server env fallback.
			const usable = Boolean(
				resolveCredentials(
					info.id,
					hasStoredKey
						? { apiKey: "stored", baseUrl: row?.baseUrl ?? undefined }
						: null,
				),
			);

			return {
				id: info.id,
				label: info.label,
				docs: info.docs,
				requiresBaseUrl: info.requiresBaseUrl ?? false,
				envKey: info.envKey,
				models: info.models,
				configured: usable,
				source: hasStoredKey
					? ("stored" as const)
					: usable
						? ("env" as const)
						: ("none" as const),
				apiKeyHint: row?.apiKeyHint ?? null,
				baseUrl: row?.baseUrl ?? null,
				defaultModel: row?.defaultModel ?? null,
			};
		});
	}),

	/** Store or replace a provider credential. The key never comes back out. */
	saveProvider: organizationProcedure
		.input(
			z.object({
				provider: providerIdSchema,
				/** Omit to keep the existing key and only change other fields. */
				apiKey: z.string().min(1).optional(),
				baseUrl: z.url().optional().or(z.literal("")),
				defaultModel: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const info = getProvider(input.provider);
			if (!info) throw new ORPCError("BAD_REQUEST");

			if (info.requiresBaseUrl && !input.baseUrl) {
				throw new ORPCError("BAD_REQUEST", {
					message: `${info.label} needs a base URL.`,
				});
			}

			let encrypted: string | undefined;
			let hint: string | undefined;
			if (input.apiKey) {
				try {
					encrypted = encryptSecret(input.apiKey);
				} catch (error) {
					// Thrown when ENCRYPTION_KEY is missing or too short. Surface
					// it as a real message rather than a generic 500.
					throw new ORPCError("PRECONDITION_FAILED", {
						message:
							error instanceof Error ? error.message : "Cannot encrypt secret.",
					});
				}
				hint = maskSecret(input.apiKey);
			}

			const values = {
				organizationId: context.organizationId,
				provider: input.provider,
				baseUrl: input.baseUrl || null,
				defaultModel: input.defaultModel ?? null,
				...(encrypted ? { apiKeyEncrypted: encrypted, apiKeyHint: hint } : {}),
			};

			await db
				.insert(aiProviderConfig)
				.values({ id: crypto.randomUUID(), ...values })
				.onConflictDoUpdate({
					target: [aiProviderConfig.organizationId, aiProviderConfig.provider],
					set: values,
				});

			return { ok: true };
		}),

	/** Forget a stored credential. The env fallback, if any, still applies. */
	removeProvider: organizationProcedure
		.input(z.object({ provider: providerIdSchema }))
		.handler(async ({ input, context }) => {
			await db
				.delete(aiProviderConfig)
				.where(
					and(
						eq(aiProviderConfig.organizationId, context.organizationId),
						eq(aiProviderConfig.provider, input.provider),
					),
				);
			return { ok: true };
		}),

	/** The organization's active provider, model and system prompt. */
	getSettings: organizationProcedure.handler(async ({ context }) => {
		const [row] = await db
			.select()
			.from(aiSettings)
			.where(eq(aiSettings.organizationId, context.organizationId))
			.limit(1);

		return {
			activeProvider: row?.activeProvider ?? DEFAULT_PROVIDER,
			activeModel: row?.activeModel ?? DEFAULT_MODEL,
			systemPrompt: row?.systemPrompt ?? "",
		};
	}),

	saveSettings: organizationProcedure
		.input(
			z.object({
				activeProvider: providerIdSchema,
				activeModel: z.string().min(1),
				systemPrompt: z.string().max(8000).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const info = getProvider(input.activeProvider);
			if (!info) throw new ORPCError("BAD_REQUEST");

			const values = {
				organizationId: context.organizationId,
				activeProvider: input.activeProvider,
				activeModel: input.activeModel,
				systemPrompt: input.systemPrompt ?? null,
			};

			await db.insert(aiSettings).values(values).onConflictDoUpdate({
				target: aiSettings.organizationId,
				set: values,
			});

			return { ok: true };
		}),
};
