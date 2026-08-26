/**
 * AI provider instances.
 *
 * A provider is a *named instance* of a base kind, so an organization can have
 * several of the same kind — separate Anthropic keys, several OpenAI-compatible
 * endpoints — each with its own credentials and model selection.
 *
 * API keys are write-only: they go in, get encrypted, and never come back out.
 * Every response carries a masked hint instead.
 */
import {
	decryptSecret,
	encryptSecret,
	getKind,
	isProviderKind,
	listModels,
	maskSecret,
	PROVIDER_KINDS,
} from "@boilerslate/ai";
import { db } from "@boilerslate/db";
import { aiProvider, aiSettings } from "@boilerslate/db/schema/ai";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { organizationProcedure } from "../index";

/** Columns safe to return. Never includes apiKeyEncrypted. */
const publicColumns = {
	id: aiProvider.id,
	name: aiProvider.name,
	kind: aiProvider.kind,
	apiKeyHint: aiProvider.apiKeyHint,
	baseUrl: aiProvider.baseUrl,
	enabledModels: aiProvider.enabledModels,
	availableModels: aiProvider.availableModels,
	lastCheckedAt: aiProvider.lastCheckedAt,
	lastError: aiProvider.lastError,
};

const kindSchema = z.string().refine(isProviderKind, {
	message: "Unknown provider kind.",
});

/** Loads a provider owned by the caller's organization, or 404s. */
async function requireProvider(providerId: string, organizationId: string) {
	const [row] = await db
		.select()
		.from(aiProvider)
		.where(
			and(
				eq(aiProvider.id, providerId),
				eq(aiProvider.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!row) {
		// Same response whether it does not exist or belongs to someone else —
		// a distinguishable 403 would confirm the id is real.
		throw new ORPCError("NOT_FOUND", { message: "Provider not found." });
	}
	return row;
}

/** Decrypts the stored key, or throws a readable error. */
function credentialsFor(row: typeof aiProvider.$inferSelect) {
	if (!row.apiKeyEncrypted) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "This provider has no API key yet.",
		});
	}
	try {
		return {
			apiKey: decryptSecret(row.apiKeyEncrypted),
			baseUrl: row.baseUrl ?? undefined,
		};
	} catch {
		throw new ORPCError("PRECONDITION_FAILED", {
			message:
				"The stored key could not be decrypted. ENCRYPTION_KEY may have changed — re-enter the key.",
		});
	}
}

export const aiRouter = {
	/** The base kinds a provider can be built on. */
	listKinds: organizationProcedure.handler(() =>
		PROVIDER_KINDS.map((k) => ({
			id: k.id,
			label: k.label,
			example: k.example,
			requiresBaseUrl: k.requiresBaseUrl,
			defaultBaseUrl: k.defaultBaseUrl ?? null,
			docs: k.docs,
			hint: k.hint,
		})),
	),

	/** Every configured provider for this organization. Never returns keys. */
	listProviders: organizationProcedure.handler(async ({ context }) =>
		db
			.select(publicColumns)
			.from(aiProvider)
			.where(eq(aiProvider.organizationId, context.organizationId))
			.orderBy(asc(aiProvider.name)),
	),

	createProvider: organizationProcedure
		.input(
			z.object({
				name: z.string().min(1).max(64),
				kind: kindSchema,
				apiKey: z.string().min(1),
				baseUrl: z.url().optional().or(z.literal("")),
			}),
		)
		.handler(async ({ input, context }) => {
			const kind = getKind(input.kind);
			if (!kind) throw new ORPCError("BAD_REQUEST");

			if (kind.requiresBaseUrl && !input.baseUrl) {
				throw new ORPCError("BAD_REQUEST", {
					message: `${kind.label} needs a base URL.`,
				});
			}

			let encrypted: string;
			try {
				encrypted = encryptSecret(input.apiKey);
			} catch (error) {
				throw new ORPCError("PRECONDITION_FAILED", {
					message:
						error instanceof Error ? error.message : "Cannot encrypt secret.",
				});
			}

			const id = crypto.randomUUID();
			try {
				await db.insert(aiProvider).values({
					id,
					organizationId: context.organizationId,
					name: input.name.trim(),
					kind: input.kind,
					apiKeyEncrypted: encrypted,
					apiKeyHint: maskSecret(input.apiKey),
					baseUrl: input.baseUrl || kind.defaultBaseUrl || null,
					// null means "every model this provider reports".
					enabledModels: null,
				});
			} catch {
				throw new ORPCError("CONFLICT", {
					message: "A provider with that name already exists.",
				});
			}

			return { id };
		}),

	updateProvider: organizationProcedure
		.input(
			z.object({
				providerId: z.string().min(1),
				name: z.string().min(1).max(64).optional(),
				/** Omit to keep the existing key. */
				apiKey: z.string().min(1).optional(),
				baseUrl: z.url().optional().or(z.literal("")),
			}),
		)
		.handler(async ({ input, context }) => {
			const existing = await requireProvider(
				input.providerId,
				context.organizationId,
			);

			const patch: Record<string, unknown> = {};
			if (input.name) patch.name = input.name.trim();
			if (input.baseUrl !== undefined) patch.baseUrl = input.baseUrl || null;
			if (input.apiKey) {
				try {
					patch.apiKeyEncrypted = encryptSecret(input.apiKey);
				} catch (error) {
					throw new ORPCError("PRECONDITION_FAILED", {
						message:
							error instanceof Error ? error.message : "Cannot encrypt secret.",
					});
				}
				patch.apiKeyHint = maskSecret(input.apiKey);
				// Credentials changed, so the cached check no longer means anything.
				patch.lastCheckedAt = null;
				patch.lastError = null;
			}

			if (Object.keys(patch).length === 0) return { ok: true };

			await db
				.update(aiProvider)
				.set(patch)
				.where(eq(aiProvider.id, existing.id));

			return { ok: true };
		}),

	deleteProvider: organizationProcedure
		.input(z.object({ providerId: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			const existing = await requireProvider(
				input.providerId,
				context.organizationId,
			);
			await db.delete(aiProvider).where(eq(aiProvider.id, existing.id));
			return { ok: true };
		}),

	/**
	 * Calls the provider's models endpoint. Doubles as the connection test —
	 * listing models is exactly the proof that the credential works.
	 */
	testConnection: organizationProcedure
		.input(z.object({ providerId: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			const row = await requireProvider(
				input.providerId,
				context.organizationId,
			);
			if (!isProviderKind(row.kind)) {
				throw new ORPCError("BAD_REQUEST", { message: "Unknown kind." });
			}

			const result = await listModels(row.kind, credentialsFor(row));

			await db
				.update(aiProvider)
				.set({
					lastCheckedAt: new Date(),
					lastError: result.ok ? null : (result.error ?? "Unknown error"),
					...(result.ok
						? {
								availableModels: result.models.map((m) => ({
									id: m.id,
									label: m.label,
								})),
							}
						: {}),
				})
				.where(eq(aiProvider.id, row.id));

			return {
				ok: result.ok,
				error: result.error ?? null,
				models: result.models.map((m) => ({ id: m.id, label: m.label })),
			};
		}),

	/** `models: null` means "all models this provider reports". */
	setEnabledModels: organizationProcedure
		.input(
			z.object({
				providerId: z.string().min(1),
				models: z.array(z.string().min(1)).nullable(),
			}),
		)
		.handler(async ({ input, context }) => {
			const row = await requireProvider(
				input.providerId,
				context.organizationId,
			);
			await db
				.update(aiProvider)
				.set({ enabledModels: input.models })
				.where(eq(aiProvider.id, row.id));
			return { ok: true };
		}),

	getSettings: organizationProcedure.handler(async ({ context }) => {
		const [row] = await db
			.select()
			.from(aiSettings)
			.where(eq(aiSettings.organizationId, context.organizationId))
			.limit(1);

		return {
			activeProviderId: row?.activeProviderId ?? null,
			activeModel: row?.activeModel ?? null,
			systemPrompt: row?.systemPrompt ?? "",
		};
	}),

	setActive: organizationProcedure
		.input(
			z.object({
				providerId: z.string().min(1).nullable(),
				model: z.string().min(1).nullable(),
				systemPrompt: z.string().max(8000).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			if (input.providerId) {
				const row = await requireProvider(
					input.providerId,
					context.organizationId,
				);
				// Refuse a model the provider is not offering, so the chat endpoint
				// cannot be pointed at something that will only fail at call time.
				if (input.model) {
					const allowed =
						row.enabledModels ?? (row.availableModels ?? []).map((m) => m.id);
					if (allowed.length > 0 && !allowed.includes(input.model)) {
						throw new ORPCError("BAD_REQUEST", {
							message: `${input.model} is not enabled on that provider.`,
						});
					}
				}
			}

			const values = {
				organizationId: context.organizationId,
				activeProviderId: input.providerId,
				activeModel: input.model,
				systemPrompt: input.systemPrompt ?? null,
			};

			await db.insert(aiSettings).values(values).onConflictDoUpdate({
				target: aiSettings.organizationId,
				set: values,
			});

			return { ok: true };
		}),
};
