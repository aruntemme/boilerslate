# AGENTS.md

Instructions for AI coding agents working in this repository.
This is the contract: follow it rather than inferring conventions from a single file.

## What this is

A monorepo boilerplate for SaaS web apps. Multi-tenant (organizations) and
themeable out of the box. Clone it, rename it, build the product on top.

## Stack

| Concern    | Choice                          | Lives in           |
| ---------- | ------------------------------- | ------------------ |
| Web app    | TanStack Start (React, SSR)     | `apps/web`         |
| API server | Hono on Bun                     | `apps/server`      |
| RPC layer  | oRPC (typed client + OpenAPI)   | `packages/api`     |
| Database   | Postgres 18 + Drizzle ORM       | `packages/db`      |
| Auth       | Better Auth + organization plugin | `packages/auth`  |
| UI         | shadcn/ui (Base UI) + Tailwind v4 | `packages/ui`    |
| Env vars   | `@t3-oss/env-core` + Zod        | `packages/env`     |
| Tasks      | Turborepo                       | `turbo.json`       |
| Lint/format| Biome                           | `biome.json`       |

Types flow end to end: Drizzle schema -> Better Auth -> oRPC router -> React
client. There is no code generation step to remember and no DTO layer to keep
in sync. If you find yourself hand-writing a type that already exists upstream,
infer it instead.

## The rule that matters most

**Every change must end with `bun run verify` passing.** It runs lint,
typecheck, build, and the real integration tests in that order. Do not report
work as finished on the basis of "it should work" — run it.

```bash
bun run verify
```

If the database is not running, tests fail. Start it first (see below).

## Setup from a cold start

```bash
bun install
bun run db:start      # Postgres in Docker, host port 5433
bun run db:migrate    # apply migrations
bun run dev           # web on :3001, api on :3000
```

Port 5433 is deliberate — 5432 collides with a Postgres installed on the host.
Change it via `POSTGRES_PORT` in the root `.env`.

## Commands

| Command | Does |
| ------- | ---- |
| `bun run verify` | lint + typecheck + build + test. **The gate.** |
| `bun run dev` | run web and server together |
| `bun run test` | integration tests (needs the database up) |
| `bun run lint` | check only, never writes |
| `bun run lint:fix` | apply formatting and safe fixes |
| `bun run check-types` | `tsc` across every package |
| `bun run db:start` / `db:stop` | Postgres container |
| `bun run db:generate` | write a migration after editing the schema |
| `bun run db:migrate` | apply pending migrations |
| `bun run db:reset` | destroy the volume and rebuild from migrations |
| `bun run db:studio` | Drizzle Studio |
| `bun run docker:up` | run the whole stack in Docker |

## Rules

**Database.** Change `packages/db/src/schema/*.ts`, then run `bun run
db:generate` and commit the generated SQL in `packages/db/src/migrations/`.
Never edit a migration that has already been applied anywhere but your own
machine — add a new one. Never use `db:push` outside local experiments; it
does not leave a migration behind.

**Auth schema is generated, not hand-written.** `packages/db/src/schema/auth.ts`
mirrors what Better Auth expects. When you add a Better Auth plugin, re-run the
generator and diff it rather than guessing the tables:

```bash
cd packages/auth
set -a && . ../../apps/server/.env && set +a
bunx @better-auth/cli generate --config ./src/index.ts --output ../db/src/schema/auth.ts --yes
```

Then check the diff. That CLI has removed still-required columns before
(`account.issuer`), so read what it produced instead of trusting it.

**Multi-tenancy.** The UI is the switcher in the sidebar header,
`/organization`, and the public `/accept-invitation/$invitationId` route.
Users belong to organizations via the `member` table with a
role (`owner`/`admin`/`member`). Any query returning tenant data must be scoped
by the caller's organization — Better Auth's endpoints do this for you, but
your own oRPC procedures do not. Scope them yourself, and add a test proving a
non-member gets a 403. `apps/server/src/index.test.ts` has the pattern.

**Density.** `--card-spacing` is overridden to `1.25rem` in `globals.css`; the
generated default of `1rem` reads cramped once cards carry charts and stat
rows. Use `StatLabel` / `StatValue` / `StatGroup` (`components/stat.tsx`) for
the uppercase-label-over-large-number pattern rather than re-inventing it.

**Theming.** Two independent axes, both set on `<html>`:
`data-theme="<id>"` picks the colour family, `.dark` picks the mode. Eight
themes ship: emerald (default), violet, blue, cyan, rose, orange, amber,
neutral.

- Token sets live in `packages/ui/src/styles/themes.css`.
- The registry — ids, labels, preview swatches — lives in
  `packages/ui/src/lib/themes.ts`.
- Adding a theme means editing **both**, and nothing else. The switcher and
  the settings page read the registry.
- Selectors are `:root[data-theme="x"]` on purpose: specificity 0,2,0 beats
  the `:root` defaults in `globals.css` regardless of import order. Do not
  "simplify" them to `[data-theme="x"]` — the defaults would win.

Radius steps are **multiplicative** (`calc(var(--radius) * 0.6)`), not additive.
Additive offsets cannot reach zero — `calc(0rem + 4px)` is still 4px — so the
"Square" setting would not actually be square. Keep them multiplicative.

`ThemeProvider` (`apps/web/src/components/theme-provider.tsx`) owns the state
after hydration; `THEME_INIT_SCRIPT` applies it before first paint, which is
what stops the theme flashing on load. Preferences persist to localStorage.

Never hard-code a colour in a component. Use the tokens — `bg-primary`,
`text-muted-foreground`, `border-border` — or the theme will not follow.

**Cursors.** Tailwind v4's Preflight sets `cursor: default` on buttons, so
pointer cursors are restored explicitly in `globals.css`. The menu and select
overrides there are deliberately **unlayered**: those items ship a
`cursor-default` utility class, and utilities always beat `@layer base`. Do not
move them into a layer.

**UI components.** `packages/ui/src/components/` is generated by the shadcn CLI
and re-generated on upgrade. Do not hand-edit those files; wrap them instead.
This is why a11y rules are relaxed there in `biome.json` and nowhere else.

The primitives are **Base UI** (`@base-ui/react`) — *not* Radix and not React
Aria. APIs differ from the Radix-era shadcn docs you will find online: there is
no `asChild`, composition uses a `render` prop instead. Check the installed
component before copying an example from the web.

The shadcn style is **`base-nova`**, set in both `components.json` files. Add
components with `bunx --bun shadcn@latest add <name>` from `packages/ui`. Do
not switch to `base-lyra`: it hard-codes `rounded-none` on ~50 elements, so the
corner-radius control silently does nothing.

**Tests exercise real behaviour.** Tests run the actual Hono app against the
actual Postgres. Do not mock the database, do not stub auth, do not assert on a
mock's call count. A test that cannot fail when the feature breaks is worse than
no test.

**Env vars.** Add them to the Zod schema in `packages/env/src/{server,web}.ts`
first. Reading `process.env` directly anywhere else is a bug — the schema is
what makes a missing variable fail at boot instead of at 3am.

**AI.** `packages/ai` holds the provider catalog, credential encryption, the
model registry and the tool definitions; `POST /ai/chat` streams. Two rules:

- Stored API keys are **write-only**. Never select `apiKeyEncrypted` into a
  response, and never add a procedure that returns a decrypted key.
- Tool arguments come from the model and are **untrusted**. Take the
  organization id from `ToolContext`, never from a tool argument.

Provider and model are resolved server-side from the caller's organization —
do not let the client choose them. See `docs/ai.md`.

**Adding a package.** `bun run gen:package <name>` scaffolds it correctly.
Import it as `@boilerslate/<name>`.

**Adding a page.** Put it in `apps/web/src/routes/_auth/` and it inherits the
sidebar shell and the auth guard automatically. Add it to `NAV_ITEMS` in
`apps/web/src/components/app-sidebar.tsx` to show it in the navigation.

**AI primitives.** `packages/ui/src/components/ai/` holds ten components for
agent interfaces: `LoadingState`, `Thinking`, `StreamingText`, `ToolChips`,
`TaskRows`, `ApprovalCard`, `ContextCards`, `CodeBlock`, `PromptBar`, `Chat`.
They are ours — written against our tokens, not vendored — so unlike
`components/`, they *are* meant to be edited. Import from the specific module
(`@boilerslate/ui/components/ai/chat`) rather than the barrel so bundlers can
drop what you do not use.

They take data as props and emit callbacks; none of them talk to a model. Wire
them to your own streaming endpoint.

**Charts.** Recharts, through the shadcn `ChartContainer` wrapper. Colours come
from the theme's `--chart-1..5` ramp, so charts re-skin with the theme — never
hard-code a hex in a chart.

Any chart inside a grid or flex parent needs **`min-w-0` on that parent**. Grid
and flex items default to `min-width: auto`, so the chart's measured width can
widen its own track, which widens the chart again — a feedback loop that blows
the layout out and squashes the plot. It renders, so the build stays green; you
only see it in a browser.

**Adding a UI component.** After `shadcn add`, render it on `/playground`
(`apps/web/src/routes/_auth/playground.tsx`). That page exists so theme and
radius changes can be checked against the whole library on one screen; a
component missing from it is a component nobody is checking.

## Project layout

```
apps/
  web/      TanStack Start app. Routes in src/routes, auth client in src/lib.
  server/   Hono entry. Mounts Better Auth at /api/auth and oRPC at /rpc.
packages/
  api/      oRPC routers and context. Add procedures here, not in apps/server.
  auth/     Better Auth config, server side.
  db/       Drizzle schema, migrations, connection.
  env/      Validated environment variables.
  ui/       shadcn components and styles.
  config/   Shared tsconfig.
```

## Gotchas that have already bitten

- Better Auth rejects state-changing requests without an `Origin` header. When
  testing with curl, pass `-H "Origin: http://localhost:3001"`.
- `bunx @better-auth/cli@latest` may target a different better-auth version than
  the one installed. Always diff its output.
- Turbo tasks marked `interactive` cannot run headlessly; `db:migrate` and
  `db:generate` are deliberately not marked that way.
- The shadcn components here are **Base UI**, not Radix. `DropdownMenuLabel`
  is a `GroupLabel` and throws at runtime unless it is inside a
  `DropdownMenuGroup` or `DropdownMenuRadioGroup`. Typecheck and build both
  pass anyway — this class of bug only shows up in a browser, so open the page
  after touching a menu.
