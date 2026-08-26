# Getting started

## Requirements

- [Bun](https://bun.sh) 1.2 or newer
- Docker (for the local Postgres)

Node 22+ works too, but the scripts assume Bun.

## First run

```bash
bun install
bun run setup        # writes .env files and generates an auth secret
bun run db:start     # Postgres 18 in Docker
bun run db:migrate   # apply migrations
bun run dev
```

- Web — <http://localhost:3001>
- API — <http://localhost:3000>
- OpenAPI reference — <http://localhost:3000/api-reference>

Sign up with any email; there is no email verification in development.

## Why port 5433

Postgres is published on **5433**, not the usual 5432, so the stack never
collides with a Postgres already installed on your machine. Change it with
`POSTGRES_PORT` in the root `.env`.

If you see `password authentication failed for user "postgres"` while the
container is healthy, something else is answering on that port.

## The one command that matters

```bash
bun run verify
```

Lint, typecheck, build, and the integration tests, in that order. CI runs
exactly this. If it passes, the change is good; if it fails, the output says
why. Do not merge on "it should work".

The tests need the database running.

## Every command

| Command | Does |
| --- | --- |
| `bun run setup` | Create `.env` files from the examples; generates the auth secret |
| `bun run dev` | Web and API together |
| `bun run dev:web` / `dev:server` | One at a time |
| `bun run verify` | lint + typecheck + build + test |
| `bun run test` | Integration tests (needs the database) |
| `bun run lint` / `lint:fix` | Check-only / apply fixes |
| `bun run check-types` | `tsc` across every package |
| `bun run db:start` / `db:stop` / `db:down` | Postgres container |
| `bun run db:generate` | Write a migration after editing the schema |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:reset` | Destroy the volume and rebuild from migrations |
| `bun run db:studio` | Drizzle Studio |
| `bun run gen:package <name>` | Scaffold a new workspace package |
| `bun run docker:up` / `docker:down` | The whole stack in Docker |

## Making it yours

1. Rename the package scope: `@boilerslate/*` appears in every
   `package.json` and import. A find-and-replace across the repo is enough.
2. Set the app name in `apps/web/src/routes/__root.tsx` (the `title` meta) and
   in `apps/web/src/components/app-sidebar.tsx`.
3. Pick a default theme in `packages/ui/src/lib/themes.ts` (`DEFAULT_THEME`).
4. Delete the placeholder pages: the landing page, and the demo content on
   `/dashboard`. Keep `/playground` — it is how you check design changes.
