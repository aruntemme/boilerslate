# AI components

Ten primitives for agent interfaces, in `packages/ui/src/components/ai/`.

They are **presentational**: data in, callbacks out. None of them talk to a
model — wire them to your own streaming endpoint. All ten run on `/playground`.

Import from the specific module so bundlers can drop what you do not use:

```ts
import { PromptBar } from "@boilerslate/ui/components/ai/prompt-bar";
```

| Component | Purpose |
| --- | --- |
| `LoadingState` | Shimmer loader with elapsed time. Three variants: grid, dots, orbit. |
| `Thinking` | Collapsible reasoning trace with per-step status. |
| `StreamingText` | Streamed answer with caret, inline sources and follow-up prompts. |
| `ToolChips` | Tool calls as compact chips that expand to show their payload. |
| `TaskRows` | Live agent task status — running, completed, failed, queued — with sub-steps. |
| `ApprovalCard` | Human-in-the-loop. Steps through questions, answers via `onComplete`. |
| `ContextCards` | Retrieved chunks with source and match score, for RAG citations. |
| `CodeBlock` | Line-numbered listing, plus a unified-diff mode for proposed edits. |
| `PromptBar` | Auto-growing composer with `@` sources, `/` commands and a model picker. |
| `Chat` | Transcript that auto-scrolls only when the reader is already at the bottom. |

## Notes on a few

**`StreamingText`** takes whatever text has arrived so far and a `streaming`
flag for the caret. `useStreamedText` is a helper for demos and for replaying a
completed response — it is not a transport.

**`PromptBar`** submits on Enter, newline on Shift+Enter. The `@` and `/`
pickers look at the token being typed, not the whole value, so an `@` earlier in
the message does not keep the picker open.

**`CodeBlock`** has no syntax highlighting, deliberately. Adding one means
shipping a highlighter plus a second colour system that fights the theme.
Structure and diff colouring carry the meaning; add a highlighter per project
if you need one.

**`Chat`** only auto-scrolls when the reader is within 100px of the bottom.
Yanking someone back down while they read history is worse than a stale scroll
position.

## Provenance

The interaction patterns are informed by [beautifului.dev](https://www.beautifului.dev),
which publishes no registry or source. These are independent implementations
written against this design system — that is why they theme correctly out of
the box.
