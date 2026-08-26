/**
 * Builds a language model from a configured provider instance.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { ProviderKind } from "./catalog";

export interface ProviderCredentials {
	apiKey: string;
	baseUrl?: string | undefined;
}

export function createModel(
	kind: ProviderKind,
	modelId: string,
	credentials: ProviderCredentials,
): LanguageModel {
	const baseURL = credentials.baseUrl || undefined;

	switch (kind) {
		case "anthropic":
			return createAnthropic({
				apiKey: credentials.apiKey,
				...(baseURL ? { baseURL } : {}),
			})(modelId);

		case "openai":
			return createOpenAI({
				apiKey: credentials.apiKey,
				...(baseURL ? { baseURL } : {}),
			})(modelId);

		case "google":
			return createGoogleGenerativeAI({
				apiKey: credentials.apiKey,
				...(baseURL ? { baseURL } : {}),
			})(modelId);

		case "compatible": {
			if (!baseURL) {
				throw new Error(
					"An OpenAI-compatible provider needs a base URL (for example http://localhost:11434/v1).",
				);
			}
			return createOpenAICompatible({
				name: "compatible",
				apiKey: credentials.apiKey,
				baseURL,
			})(modelId);
		}

		default: {
			const exhaustive: never = kind;
			throw new Error(`Unknown provider kind: ${String(exhaustive)}`);
		}
	}
}
