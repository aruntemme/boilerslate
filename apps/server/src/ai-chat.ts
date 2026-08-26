/**
 * Streaming chat endpoint with tool calling.
 *
 * Mounted as a plain Hono route rather than an oRPC procedure because the AI
 * SDK returns a streaming `Response` directly, and oRPC's typed envelope would
 * only get in the way of a token stream.
 *
 * The provider instance, model and credentials all resolve server-side from
 * the caller's organization. The client sends messages and nothing else — a
 * client that could name its own provider could spend a key it should not
 * reach.
 */
import {
	createModel,
	createTools,
	decryptSecret,
	isProviderKind,
} from "@boilerslate/ai";
import { auth } from "@boilerslate/auth";
import { db } from "@boilerslate/db";
import { aiProvider, aiSettings } from "@boilerslate/db/schema/ai";
import {
	convertToModelMessages,
	stepCountIs,
	streamText,
	type UIMessage,
} from "ai";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

export const aiChat = new Hono();

aiChat.post("/ai/chat", async (c) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const organizationId = session.session.activeOrganizationId;
	if (!organizationId) {
		return c.json({ error: "Select an organization first." }, 403);
	}

	const body = (await c.req.json()) as { messages?: UIMessage[] };
	const messages = body.messages ?? [];
	if (messages.length === 0) {
		return c.json({ error: "No messages." }, 400);
	}

	const [settings] = await db
		.select()
		.from(aiSettings)
		.where(eq(aiSettings.organizationId, organizationId))
		.limit(1);

	if (!settings?.activeProviderId || !settings.activeModel) {
		return c.json({ error: "No active model. Choose one in Settings." }, 412);
	}

	const [provider] = await db
		.select()
		.from(aiProvider)
		.where(
			and(
				eq(aiProvider.id, settings.activeProviderId),
				eq(aiProvider.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!provider) {
		return c.json({ error: "The active provider no longer exists." }, 412);
	}
	if (!isProviderKind(provider.kind)) {
		return c.json({ error: `Unknown provider kind: ${provider.kind}` }, 400);
	}
	if (!provider.apiKeyEncrypted) {
		return c.json({ error: `${provider.name} has no API key.` }, 412);
	}

	// Re-check the model against what the provider is offering. Settings
	// validates on write, but the selection can go stale if models are
	// disabled afterwards.
	const allowed =
		provider.enabledModels ?? (provider.availableModels ?? []).map((m) => m.id);
	if (allowed.length > 0 && !allowed.includes(settings.activeModel)) {
		return c.json(
			{ error: `${settings.activeModel} is not enabled on ${provider.name}.` },
			412,
		);
	}

	let apiKey: string;
	try {
		apiKey = decryptSecret(provider.apiKeyEncrypted);
	} catch {
		return c.json(
			{
				error:
					"The stored key could not be decrypted. ENCRYPTION_KEY may have changed.",
			},
			412,
		);
	}

	try {
		const modelMessages = await convertToModelMessages(messages);

		const result = streamText({
			model: createModel(provider.kind, settings.activeModel, {
				apiKey,
				baseUrl: provider.baseUrl ?? undefined,
			}),
			system:
				settings.systemPrompt ||
				"You are a helpful assistant embedded in a SaaS application. Be concise. Use the tools available to you rather than guessing at facts you can look up.",
			messages: modelMessages,
			tools: createTools({ organizationId, userId: session.user.id }),
			// Without this the model stops after one tool call instead of using
			// the result to answer.
			stopWhen: stepCountIs(8),
		});

		return result.toUIMessageStreamResponse();
	} catch (error) {
		console.error("[ai/chat]", error);
		return c.json(
			{ error: error instanceof Error ? error.message : "Generation failed." },
			500,
		);
	}
});
