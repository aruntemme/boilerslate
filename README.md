# boilerslate

A lightweight, modular monorepo starting point for full-stack SaaS apps.
Multi-tenant, themeable, and typed end to end from the first commit.

```bash
bun install
bun run setup        # writes .env files, generates an auth secret
bun run db:start     # Postgres 18 in Docker
bun run db:migrate
bun run dev
```

Web on <http://localhost:3001>, API on <http://localhost:3000>.

## Stack

- **[TanStack Start](https://tanstack.com/start)** — React with SSR and typed routing
- **[Hono](https://hono.dev)** on **[Bun](https://bun.sh)** — the API server
- **[oRPC](https://orpc.unnoq.com)** — typed RPC, with OpenAPI docs for free
- **[Drizzle](https://orm.drizzle.team)** + **Postgres 18** — schema and migrations in TypeScript
- **[Better Auth](https://better-auth.com)** — email/password auth plus organizations
- **[shadcn/ui](https://ui.shadcn.com)** (`base-nova`, on [Base UI](https://base-ui.com)) + **Tailwind v4**
- **[Recharts](https://recharts.org)** — charts wired to the theme
- **[AI SDK](https://ai-sdk.dev)** — multi-provider LLM calls with tool calling
- **[Turborepo](https://turbo.build)** + **[Biome](https://biomejs.dev)** — tasks, linting, formatting

Types flow from the database schema through to the React client with no code
generation step and no DTO layer.

## What you get

**Auth and multi-tenancy.** Email/password sign-in, sessions in Postgres, and
organizations with `owner` / `admin` / `member` roles, teams, and invitations,
with a post-login chooser, a switcher and a management page. Tenant isolation and role enforcement are
covered by tests: a non-member gets a 403 even when naming an
organization id directly.

**A design system with eight themes.** Emerald, violet, blue, cyan, rose,
orange, amber and neutral, each in light and dark — theme and mode are
independent axes, switchable at runtime and applied before first paint so there
is no flash on load. Corner radius is adjustable too.

**Multi-provider AI with tool calling.** Configure as many providers as you
like — several Anthropic keys, several OpenAI-compatible endpoints — each with
its own credentials. Models are discovered live from each provider, with a
connection test, and you choose all of them or an allow-list. Keys are
encrypted before storage and never sent back to the browser.

**36 UI components plus ten AI primitives** — streaming text with citations,
reasoning traces, tool-call chips, live task status, human-in-the-loop
approval, retrieved-context cards, a code/diff viewer, a prompt composer with
`@` sources and `/` commands, and a chat transcript.

**Four pages to build from.** `/dashboard` (charts and stats), `/organization`
(members, roles, invitations), `/settings` (themes and AI providers) and
`/playground` — every component live on one screen, so a
design change can be checked against the whole library at once.

## Verification

One command gates everything — lint, typecheck, build, and integration tests
that run the real API against a real Postgres:

```bash
bun run verify
```

CI runs exactly this on every push and pull request. The tests do not mock the
database or stub auth; if they pass, the features genuinely work.

## Layout

```
apps/
  web/      TanStack Start app
  server/   Hono API — auth at /api/auth, oRPC at /rpc
packages/
  api/      oRPC routers and context
  auth/     Better Auth configuration
  db/       Drizzle schema and migrations
  env/      Zod-validated environment variables
  ui/       components, styles, themes, AI primitives
  config/   shared tsconfig
```

## Adding to the base

The core stays small on purpose:

```bash
bun run gen:package <name>              # new workspace package
bunx create-better-t-stack@latest add   # PWA, docs site, desktop shell, …
```

## Deployment

Dockerfiles and a compose file for the whole stack are included:

```bash
bun run docker:up
```

See [docs/deployment.md](docs/deployment.md) before pointing it at the
internet.

## Documentation

- [Getting started](docs/getting-started.md) — setup, commands, making it yours
- [Architecture](docs/architecture.md) — layout, type safety, testing
- [Design system](docs/design-system.md) — themes, tokens, charts
- [Multi-tenancy](docs/multi-tenancy.md) — organizations and scoping
- [AI](docs/ai.md) — providers, credentials, tool calling
- [AI components](docs/ai-components.md) — the ten agent primitives
- [Deployment](docs/deployment.md) — Docker, production, CI

`AGENTS.md` (symlinked as `CLAUDE.md`) is the instruction layer for AI coding
agents — Claude Code, Cursor, Codex, Copilot and others all read it. It is the
highest-leverage file in the repo; keep it current.

## Known gaps

- No email sending, so invitations are shared as links rather than delivered
- No payments; Better Auth integrates with Polar in one flag when you want it
- No custom roles beyond owner / admin / member

## License

MIT
