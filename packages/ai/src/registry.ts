/**
 * Builds a language model from provider credentials.
 *
 * Credentials resolve per organization first, then fall back to server env
 * vars — so a self-hosted single-tenant deployment can just set env vars and
 * never touch the settings UI, while a multi-tenant SaaS can let each customer
 * bring their own key.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getProvider, type ProviderId } from "./catalog";

export interface ProviderCredentials {
	apiKey: string;
	/** Required for the OpenAI-compatible provider; optional elsewhere. */
	baseUrl?: string | undefined;
}

/** Falls back to the provider's env var when no credential is stored. */
export function resolveCredentials(
	providerId: ProviderId,
	stored?: ProviderCredentials | null,
): ProviderCredentials | null {
	if (stored?.apiKey) return stored;

	const info = getProvider(providerId);
	if (!info) return null;

	const envKey = process.env[info.envKey];
	if (!envKey) return null;

	return {
		apiKey: envKey,
		baseUrl: stored?.baseUrl ?? process.env[`${info.envKey}_BASE_URL`],
	};
}

export function createModel(
	providerId: ProviderId,
	modelId: string,
	credentials: ProviderCredentials,
): LanguageModel {
	switch (providerId) {
		case "anthropic":
			return createAnthropic({
				apiKey: credentials.apiKey,
				...(credentials.baseUrl ? { baseURL: credentials.baseUrl } : {}),
			})(modelId);

		case "openai":
			return createOpenAI({
				apiKey: credentials.apiKey,
				...(credentials.baseUrl ? { baseURL: credentials.baseUrl } : {}),
			})(modelId);

		case "google":
			return createGoogleGenerativeAI({
				apiKey: credentials.apiKey,
				...(credentials.baseUrl ? { baseURL: credentials.baseUrl } : {}),
			})(modelId);

		case "compatible": {
			if (!credentials.baseUrl) {
				throw new Error(
					"The OpenAI-compatible provider needs a base URL (for example http://localhost:11434/v1).",
				);
			}
			return createOpenAICompatible({
				name: "compatible",
				apiKey: credentials.apiKey,
				baseURL: credentials.baseUrl,
			})(modelId);
		}

		default: {
			const exhaustive: never = providerId;
			throw new Error(`Unknown provider: ${String(exhaustive)}`);
		}
	}
}
