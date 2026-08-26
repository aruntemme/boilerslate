# AI

Multi-provider LLM support built on the [AI SDK](https://ai-sdk.dev)
(`ai@7`), with tool calling and per-organization provider configuration.

## Why the AI SDK

The requirement was several providers, switchable models, and tool calling. The
AI SDK is the only TypeScript option that gives all three behind one interface:
`streamText` takes any provider's model, tools are Zod schemas with an
`execute` function, and the loop between tool call and tool result is handled
for you.

The trade-off is worth stating: a provider-agnostic layer exposes the
intersection of what providers support, so provider-specific features (Claude's
adaptive thinking and effort levels, prompt-cache breakpoints) are not
first-class. If you commit to one provider and want those, use that provider's
own SDK directly — the abstraction is what you would be giving up.

## Layout

```
packages/ai/
  catalog.ts   providers and models the UI can offer
  crypto.ts    AES-256-GCM envelope for stored credentials
  registry.ts  credentials → a live model
  tools.ts     the tools the model may call
apps/server/src/ai-chat.ts   POST /ai/chat — streaming, with tool calling
packages/api/src/routers/ai.ts   provider configuration procedures
```

## Providers

Anthropic, OpenAI, Google, and any OpenAI-compatible endpoint (Ollama, vLLM,
LM Studio, Groq, OpenRouter — anything that speaks the OpenAI wire format).

Add one by appending to `PROVIDERS` in `packages/ai/src/catalog.ts` and adding
a case to `createModel` in `registry.ts`. The settings UI reads the catalog, so
nothing else needs to change.

## Where credentials live

Two sources, checked in order:

1. **Stored per organization** — entered through Settings, encrypted with
   AES-256-GCM under `ENCRYPTION_KEY` before it reaches the database.
2. **Server environment** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and so on.

Single-tenant deployments can ignore the UI entirely and just set env vars.
Multi-tenant SaaS can let each customer bring their own key.

### The rule about keys

**A stored key is write-only.** It goes in through `saveProvider`, is encrypted
immediately, and is never selected into any response — `listProviders`
deliberately does not select the `apiKeyEncrypted` column. What the UI shows is
`apiKeyHint`, a masked fragment like `sk-…4f2a`.

Tests cover this directly: `stores a key and never returns it` asserts the
plaintext appears nowhere in the response body, and `isolates provider config
between organizations` asserts one tenant's key never reaches another.

Encryption protects a leaked database dump. It does not protect a compromised
server, which holds the master key by necessity — swap `getMasterKey` in
`crypto.ts` for a KMS call if you need that boundary.

> Rotating `ENCRYPTION_KEY` makes every stored key undecryptable. The chat
> endpoint falls back to the env credential rather than erroring, but customers
> will have to re-enter their keys. Re-encrypt before rotating if that matters.

## Tool calling

Tools are defined in `packages/ai/src/tools.ts` with a Zod input schema and an
`execute` function. `stopWhen: stepCountIs(8)` lets the model call a tool, read
the result, and continue — without it, generation stops at the first tool call
instead of answering.

```ts
myTool: tool({
  description: "What it does, and when to reach for it.",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => search(query, context.organizationId),
}),
```

**Tool arguments are untrusted.** They come from the model, which can be talked
into producing anything by content in its context. Take the organization id
from `ToolContext` — which comes from the session — never from an argument. A
tool that accepts a tenant id as a parameter is a data leak waiting for the
right prompt.

The bundled `calculate` tool shows the other half of this: it validates the
expression against a character allow-list rather than calling `eval`, because
`eval` on model output is remote code execution with extra steps.

Omit `execute` to forward a call to the client instead — that is how you build
a confirmation step before something destructive.

## The chat endpoint

`POST /ai/chat` is a Hono route rather than an oRPC procedure, because the AI
SDK returns a streaming `Response` and oRPC's typed envelope would only get in
the way of a token stream.

Provider, model and credentials all resolve **server-side** from the caller's
organization. The client sends messages and nothing else — a client that could
name its own model could also name a provider whose key it should not be able
to spend.

Status codes: `401` no session, `403` no active organization, `412` no
credentials for the selected provider.

## Using it from the client

`packages/ui/src/components/ai/` has the interface primitives — `Chat`,
`PromptBar`, `StreamingText`, `ToolChips`. Wire them to the endpoint with the
AI SDK's `useChat` from `@ai-sdk/react`, pointing at `/ai/chat`.

## Model IDs go stale

The catalog is a static list with hard-coded model ids and indicative prices.
Providers rename and retire models faster than a boilerplate can track — treat
`catalog.ts` as something you check when you fork, not as a source of truth.
