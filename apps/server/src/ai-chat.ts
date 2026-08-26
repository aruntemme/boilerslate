/**
 * Streaming chat endpoint with tool calling.
 *
 * Mounted as a plain Hono route rather than an oRPC procedure because the AI
 * SDK returns a streaming `Response` directly, and oRPC's typed envelope would
 * only get in the way of a token stream.
 *
 * Provider, model and credentials all resolve server-side from the caller's
 * organization. The client picks nothing — a client that could name its own
 * model could also name a provider whose key it should not be able to spend.
 */
import {
	createModel,
	createTools,
	DEFAULT_MODEL,
	DEFAULT_PROVIDER,
	decryptSecret,
	getProvider,
	isProviderId,
	resolveCredentials,
} from "@boilerslate/ai";
import { auth } from "@boilerslate/auth";
import { db } from "@boilerslate/db";
import { aiProviderConfig, aiSettings } from "@boilerslate/db/schema/ai";
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

	// Which provider and model this organization is using.
	const [settings] = await db
		.select()
		.from(aiSettings)
		.where(eq(aiSettings.organizationId, organizationId))
		.limit(1);

	const providerId = isProviderId(settings?.activeProvider)
		? settings.activeProvider
		: DEFAULT_PROVIDER;
	const modelId = settings?.activeModel ?? DEFAULT_MODEL;

	if (!getProvider(providerId)) {
		return c.json({ error: `Unknown provider: ${providerId}` }, 400);
	}

	// Stored credential, if this organization has one.
	const [config] = await db
		.select()
		.from(aiProviderConfig)
		.where(
			and(
				eq(aiProviderConfig.organizationId, organizationId),
				eq(aiProviderConfig.provider, providerId),
			),
		)
		.limit(1);

	let stored: { apiKey: string; baseUrl?: string } | null = null;
	if (config?.apiKeyEncrypted) {
		try {
			stored = {
				apiKey: decryptSecret(config.apiKeyEncrypted),
				...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
			};
		} catch {
			// A key encrypted under a different ENCRYPTION_KEY, or a corrupted
			// row. Fall through to the env credential rather than 500.
			stored = null;
		}
	}

	const credentials = resolveCredentials(providerId, stored);
	if (!credentials) {
		return c.json(
			{
				error: `No credentials for ${providerId}. Add a key in Settings, or set the provider's environment variable.`,
			},
			412,
		);
	}

	try {
		const modelMessages = await convertToModelMessages(messages);

		const result = streamText({
			model: createModel(providerId, modelId, credentials),
			system:
				settings?.systemPrompt ||
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
