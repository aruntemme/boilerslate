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
  catalog.ts   base provider kinds
  models.ts    live model discovery / connection testing
  crypto.ts    AES-256-GCM envelope for stored credentials
  registry.ts  credentials → a live model
  tools.ts     the tools the model may call
apps/server/src/ai-chat.ts   POST /ai/chat — streaming, with tool calling
packages/api/src/routers/ai.ts   provider configuration procedures
```

## Providers are instances, not types

A **kind** is the wire protocol and SDK adapter: `anthropic`, `openai`,
`google`, `compatible`. A **provider** is a configured instance of a kind — so
an organization can have several of the same kind:

```
Claude — production     (anthropic, prod key)
Claude — staging        (anthropic, dev key)
Ollama — local          (compatible, http://localhost:11434/v1)
Groq                    (compatible, https://api.groq.com/openai/v1)
```

Each has its own name, credentials, base URL and model selection. Names are
unique within an organization.

Add a kind by appending to `PROVIDER_KINDS` in `packages/ai/src/catalog.ts`,
adding a case to `createModel` in `registry.ts`, and a branch in `listModels`
in `models.ts`. Nothing else changes — the UI reads the kind list from the API.

## Models are discovered, not listed

There is no static model catalogue. `ai.testConnection` calls the provider's
own models endpoint and caches the result on the provider row:

| Kind | Endpoint |
| --- | --- |
| anthropic | `GET {base}/models` with `x-api-key` + `anthropic-version` |
| openai / compatible | `GET {base}/models` with `Authorization: Bearer` |
| google | `GET {base}/models?key=…`, filtered to models supporting `generateContent` |

Listing models *is* the connection test — reaching the catalogue is exactly the
proof that the credential works, so the two are one call. A hard-coded list
would be wrong within weeks and could never know which models *your* key can
actually reach.

### Choosing which models to expose

`enabledModels` is either an array or `null`:

- **`null` means all** — whatever the provider currently reports. New models
  appear without anyone editing the configuration. This is the default.
- **An array** is an allow-list.

`setActive` refuses a model that is not enabled, and the chat endpoint
re-checks at call time, because a selection can go stale if models are disabled
afterwards.

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

## Rotating the encryption key

Rotating `ENCRYPTION_KEY` makes every stored provider key undecryptable. The
chat endpoint returns a readable 412 rather than a 500, but customers will have
to re-enter their keys. Re-encrypt before rotating if that matters.
