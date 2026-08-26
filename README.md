# boilerslate

A lightweight, modular monorepo boilerplate for full-stack SaaS apps.
Multi-tenant and themeable from the first commit.

## Quick start

```bash
bun install
bun run setup        # writes .env files, generates an auth secret
bun run db:start     # Postgres 18 in Docker (host port 5433)
bun run db:migrate
bun run dev
```

Web on <http://localhost:3001>, API on <http://localhost:3000>.

## Stack

- **[TanStack Start](https://tanstack.com/start)** — React with SSR and typed routing
- **[Hono](https://hono.dev)** on **[Bun](https://bun.sh)** — the API server
- **[oRPC](https://orpc.unnoq.com)** — typed RPC, with OpenAPI docs for free
- **[Drizzle](https://orm.drizzle.team)** + **Postgres** — schema and migrations in TypeScript
- **[Better Auth](https://better-auth.com)** — email/password auth plus organizations
- **[shadcn/ui](https://ui.shadcn.com)** (`base-nova`, on [Base UI](https://base-ui.com)) + **Tailwind v4** — components, sidebar shell, eight themes
- **[Turborepo](https://turbo.build)** + **[Biome](https://biomejs.dev)** — task running, linting, formatting

Types flow from the database schema through to the React client with no code
generation step and no DTO layer.

## Layout

```
apps/
  web/      TanStack Start app
  server/   Hono API — mounts auth at /api/auth, oRPC at /rpc
packages/
  api/      oRPC routers and context
  auth/     Better Auth configuration
  db/       Drizzle schema and migrations
  env/      Zod-validated environment variables
  ui/       shadcn components, styles, brand theme
  config/   shared tsconfig
```

## Verification

One command gates everything — lint, typecheck, build, and integration tests
that run the real API against a real Postgres:

```bash
bun run verify
```

CI runs exactly this on every push and pull request.

## Multi-tenancy

Users belong to organizations with `owner` / `admin` / `member` roles, via
Better Auth's organization plugin. Invitations, membership and role checks are
built in, and the test suite covers tenant isolation — a non-member gets a 403
even when naming an organization id directly.

```ts
await authClient.organization.create({ name: "Acme Inc", slug: "acme" });
await authClient.organization.inviteMember({ email, role: "member" });
```

When you write your own oRPC procedures, scope them to the caller's
organization yourself — see `AGENTS.md`.

## Dashboard & charts

`/dashboard` is the reference for data-dense pages: KPI cards with sparklines,
a bar chart with a divided stat footer, a donut with a centred total, an area
chart and usage meters. Charts are [Recharts](https://recharts.org) via the
shadcn `ChartContainer`, coloured from the theme's chart ramp — switch theme
and every chart follows.

## AI components

Ten primitives for agent interfaces live in
`packages/ui/src/components/ai/` — streaming text with citations, reasoning
traces, tool-call chips, live task status, human-in-the-loop approval,
retrieved-context cards, a code/diff viewer, a prompt composer with `@`
sources and `/` commands, and a chat transcript.

They are presentational: data in, callbacks out, no model client. See them all
running on `/playground`.

## Design system

Eight themes — emerald, violet, blue, cyan, rose, orange, amber, neutral —
each with a full light and dark palette. Theme and mode are independent axes
on `<html>`:

```html
<html class="dark" data-theme="violet">
```

Users switch themes from the header dropdown or the settings page; the choice
persists and is applied before first paint, so there is no flash on load.
Corner radius is adjustable too.

Add a theme by adding a token block in `packages/ui/src/styles/themes.css` and
an entry in `packages/ui/src/lib/themes.ts`. Nothing else needs to change.

## Adding to the base

The core stays small on purpose. Add what a given project needs:

```bash
bun run gen:package <name>              # new workspace package
bunx create-better-t-stack@latest add   # PWA, docs site, desktop shell, ...
```

## Deployment

Dockerfiles and a compose file for the whole stack are included:

```bash
bun run docker:up
```

This runs anywhere Docker does — a VPS, Railway, Fly, or your own hardware.

## Working with AI agents

`AGENTS.md` (symlinked as `CLAUDE.md`) is the instruction layer for coding
agents — Claude Code, Cursor, Codex, Copilot and others all read it. It records
the conventions, the commands, and the gotchas already hit. Keep it current;
it is the highest-leverage file in the repo.
