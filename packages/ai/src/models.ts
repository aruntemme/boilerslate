/**
 * Model discovery and connection testing.
 *
 * Every provider exposes a models endpoint; we call it over plain HTTP rather
 * than through the AI SDK, because the SDK's job is inference and these are
 * catalogue calls. Doing it live is the whole point — a hard-coded list is
 * wrong within weeks, and it cannot know which models *your* key can reach.
 */
import type { ProviderKind } from "./catalog";

export interface DiscoveredModel {
	id: string;
	label: string;
	/** Provider-reported creation time, when available. Used only for sorting. */
	created?: number;
}

export interface ConnectionResult {
	ok: boolean;
	models: DiscoveredModel[];
	error?: string;
}

const TIMEOUT_MS = 15_000;

function normaliseBase(baseUrl: string) {
	return baseUrl.replace(/\/+$/, "");
}

/** Turns "claude-opus-5" into "Claude Opus 5" for display. */
function humanise(id: string) {
	return id
		.replace(/^models\//, "")
		.split(/[-_]/)
		.map((part) =>
			/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1),
		)
		.join(" ");
}

async function request(url: string, headers: Record<string, string>) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, { headers, signal: controller.signal });
		const text = await res.text();
		if (!res.ok) {
			// Provider error bodies are wildly inconsistent; surface something
			// short and readable rather than a wall of JSON.
			let detail = text.slice(0, 200);
			try {
				const parsed = JSON.parse(text);
				detail = parsed?.error?.message ?? parsed?.message ?? detail;
			} catch {
				// not JSON — keep the truncated text
			}
			throw new Error(`${res.status} ${res.statusText}: ${detail}`);
		}
		return JSON.parse(text);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Lists the models a credential can actually reach, and by doing so proves the
 * credential works — which is why "test connection" and "fetch models" are the
 * same call.
 */
export async function listModels(
	kind: ProviderKind,
	credentials: { apiKey: string; baseUrl?: string | undefined },
): Promise<ConnectionResult> {
	try {
		let models: DiscoveredModel[] = [];

		switch (kind) {
			case "anthropic": {
				const base = normaliseBase(
					credentials.baseUrl || "https://api.anthropic.com/v1",
				);
				const json = await request(`${base}/models?limit=1000`, {
					"x-api-key": credentials.apiKey,
					"anthropic-version": "2023-06-01",
				});
				models = (json.data ?? []).map((m: Record<string, unknown>) => ({
					id: String(m.id),
					label: String(m.display_name ?? humanise(String(m.id))),
					created: m.created_at ? Date.parse(String(m.created_at)) : undefined,
				}));
				break;
			}

			case "openai":
			case "compatible": {
				const base = normaliseBase(
					credentials.baseUrl || "https://api.openai.com/v1",
				);
				const json = await request(`${base}/models`, {
					Authorization: `Bearer ${credentials.apiKey}`,
				});
				models = (json.data ?? []).map((m: Record<string, unknown>) => ({
					id: String(m.id),
					label: humanise(String(m.id)),
					created: typeof m.created === "number" ? m.created * 1000 : undefined,
				}));
				break;
			}

			case "google": {
				const base = normaliseBase(
					credentials.baseUrl ||
						"https://generativelanguage.googleapis.com/v1beta",
				);
				// Google takes the key as a query parameter rather than a header.
				const json = await request(
					`${base}/models?key=${encodeURIComponent(credentials.apiKey)}&pageSize=200`,
					{},
				);
				models = (json.models ?? [])
					.filter((m: Record<string, unknown>) =>
						((m.supportedGenerationMethods as string[]) ?? []).includes(
							"generateContent",
						),
					)
					.map((m: Record<string, unknown>) => ({
						// The AI SDK wants the bare id, not the "models/" prefix.
						id: String(m.name).replace(/^models\//, ""),
						label: String(m.displayName ?? humanise(String(m.name))),
					}));
				break;
			}

			default: {
				const exhaustive: never = kind;
				throw new Error(`Unknown provider kind: ${String(exhaustive)}`);
			}
		}

		// Newest first when the provider tells us, alphabetical otherwise.
		models.sort((a, b) =>
			a.created && b.created ? b.created - a.created : a.id.localeCompare(b.id),
		);

		return { ok: true, models };
	} catch (error) {
		const message =
			error instanceof Error
				? error.name === "AbortError"
					? "The provider did not respond within 15 seconds."
					: error.message
				: "Could not reach the provider.";
		return { ok: false, models: [], error: message };
	}
}
