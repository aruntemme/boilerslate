/**
 * Base provider kinds.
 *
 * A "kind" is the wire protocol and SDK adapter. A *provider* is a configured
 * instance of a kind — you can have several of the same kind (a production and
 * a staging Anthropic key, three different OpenAI-compatible endpoints), each
 * with its own credentials and its own set of enabled models.
 *
 * There is no static model list any more: models are discovered from the
 * provider itself, because any hard-coded list goes stale the week it is
 * written.
 */

export type ProviderKind = "anthropic" | "openai" | "google" | "compatible";

export interface ProviderKindInfo {
	id: ProviderKind;
	label: string;
	/** Shown as the placeholder when adding a provider of this kind. */
	example: string;
	/** Base URL is mandatory for this kind. */
	requiresBaseUrl: boolean;
	/** Default base URL when the user does not supply one. */
	defaultBaseUrl?: string;
	docs: string;
	hint: string;
}

export const PROVIDER_KINDS: readonly ProviderKindInfo[] = [
	{
		id: "anthropic",
		label: "Anthropic",
		example: "Claude — production",
		requiresBaseUrl: false,
		defaultBaseUrl: "https://api.anthropic.com/v1",
		docs: "https://docs.claude.com",
		hint: "Claude models. Keys start with sk-ant-.",
	},
	{
		id: "openai",
		label: "OpenAI",
		example: "OpenAI — production",
		requiresBaseUrl: false,
		defaultBaseUrl: "https://api.openai.com/v1",
		docs: "https://platform.openai.com/docs",
		hint: "Keys start with sk-.",
	},
	{
		id: "google",
		label: "Google",
		example: "Gemini",
		requiresBaseUrl: false,
		defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
		docs: "https://ai.google.dev/gemini-api/docs",
		hint: "Gemini models via the Generative Language API.",
	},
	{
		id: "compatible",
		label: "OpenAI-compatible",
		example: "Ollama — local",
		requiresBaseUrl: true,
		docs: "https://ai-sdk.dev/providers/openai-compatible-providers",
		hint: "Ollama, vLLM, LM Studio, Groq, OpenRouter, Together — anything speaking the OpenAI wire format.",
	},
] as const;

export function getKind(id: string): ProviderKindInfo | undefined {
	return PROVIDER_KINDS.find((k) => k.id === id);
}

export function isProviderKind(value: unknown): value is ProviderKind {
	return PROVIDER_KINDS.some((k) => k.id === value);
}
