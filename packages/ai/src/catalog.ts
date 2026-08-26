/**
 * Provider and model catalog.
 *
 * A static list on purpose: the settings UI has to render providers and models
 * that are not configured yet, so it cannot ask a live API what exists. Prices
 * are per million tokens and are indicative — check the provider before you
 * bill anyone on them.
 */

export type ProviderId = "anthropic" | "openai" | "google" | "compatible";

export interface ModelInfo {
	id: string;
	label: string;
	/** Context window in tokens. */
	context: number;
	/** USD per million input / output tokens. Indicative. */
	price?: { input: number; output: number };
	/** Whether the model can call tools. */
	tools: boolean;
	/** Whether the model exposes a reasoning/thinking mode. */
	reasoning?: boolean;
}

export interface ProviderInfo {
	id: ProviderId;
	label: string;
	/** Env var read as the fallback credential when no org key is stored. */
	envKey: string;
	/** Providers that need a base URL (self-hosted, gateways, Ollama, vLLM). */
	requiresBaseUrl?: boolean;
	docs: string;
	models: ModelInfo[];
}

export const PROVIDERS: readonly ProviderInfo[] = [
	{
		id: "anthropic",
		label: "Anthropic",
		envKey: "ANTHROPIC_API_KEY",
		docs: "https://docs.claude.com",
		models: [
			{
				id: "claude-opus-5",
				label: "Claude Opus 5",
				context: 1_000_000,
				price: { input: 5, output: 25 },
				tools: true,
				reasoning: true,
			},
			{
				id: "claude-sonnet-5",
				label: "Claude Sonnet 5",
				context: 1_000_000,
				price: { input: 2, output: 10 },
				tools: true,
				reasoning: true,
			},
			{
				id: "claude-haiku-4-5",
				label: "Claude Haiku 4.5",
				context: 200_000,
				price: { input: 1, output: 5 },
				tools: true,
			},
		],
	},
	{
		id: "openai",
		label: "OpenAI",
		envKey: "OPENAI_API_KEY",
		docs: "https://platform.openai.com/docs",
		models: [
			{
				id: "gpt-5",
				label: "GPT-5",
				context: 400_000,
				tools: true,
				reasoning: true,
			},
			{ id: "gpt-5-mini", label: "GPT-5 mini", context: 400_000, tools: true },
			{
				id: "o4-mini",
				label: "o4-mini",
				context: 200_000,
				tools: true,
				reasoning: true,
			},
		],
	},
	{
		id: "google",
		label: "Google",
		envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
		docs: "https://ai.google.dev/gemini-api/docs",
		models: [
			{
				id: "gemini-3-pro",
				label: "Gemini 3 Pro",
				context: 1_000_000,
				tools: true,
				reasoning: true,
			},
			{
				id: "gemini-3-flash",
				label: "Gemini 3 Flash",
				context: 1_000_000,
				tools: true,
			},
		],
	},
	{
		id: "compatible",
		label: "OpenAI-compatible",
		envKey: "COMPATIBLE_API_KEY",
		requiresBaseUrl: true,
		docs: "https://ai-sdk.dev/providers/openai-compatible-providers",
		models: [
			// Anything served behind an OpenAI-compatible endpoint: Ollama, vLLM,
			// LM Studio, Together, Groq, OpenRouter. The id is whatever that
			// endpoint calls the model, so these are examples, not a fixed list.
			{
				id: "llama-3.3-70b",
				label: "Llama 3.3 70B",
				context: 128_000,
				tools: true,
			},
			{
				id: "qwen3-coder",
				label: "Qwen3 Coder",
				context: 256_000,
				tools: true,
			},
		],
	},
] as const;

export function getProvider(id: string): ProviderInfo | undefined {
	return PROVIDERS.find((p) => p.id === id);
}

export function isProviderId(value: unknown): value is ProviderId {
	return PROVIDERS.some((p) => p.id === value);
}

/** The default used when an organization has configured nothing. */
export const DEFAULT_PROVIDER: ProviderId = "anthropic";
export const DEFAULT_MODEL = "claude-opus-5";
