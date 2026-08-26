# Deployment

Docker is the default because it runs anywhere — a VPS, Railway, Fly, Render,
or your own hardware — and keeps costs predictable.

## The whole stack

```bash
bun run docker:up     # build and start web, server and postgres
bun run docker:logs
bun run docker:down
```

`docker-compose.yml` builds `apps/web` and `apps/server` from their own
Dockerfiles and waits on health checks, so the API only starts once Postgres is
accepting connections.

## Going to production

The compose file is a working local stack, not a hardened production
deployment. Before it faces the internet:

1. **Secrets.** `BETTER_AUTH_SECRET` must be a fresh random value per
   environment (`openssl rand -base64 32`). `POSTGRES_PASSWORD` must not be
   `password`.
2. **URLs.** Set `BETTER_AUTH_URL`, `CORS_ORIGIN` and `VITE_SERVER_URL` to real
   origins. `CORS_ORIGIN` must match the web origin exactly or auth cookies are
   rejected.
3. **Cookies.** `packages/auth/src/index.ts` sets `sameSite: "none"` with
   `secure: true`, which requires HTTPS. Terminate TLS in front of the stack.
4. **Database.** Run Postgres as a managed service, or at minimum move the
   volume somewhere backed up. The compose Postgres is for development.
5. **Migrations.** Run `bun run db:migrate` as a release step, before the new
   server starts.

## Managed alternatives

The stack is portable; only the database wiring changes.

| Target | Change |
| --- | --- |
| **Neon / Supabase** | Point `DATABASE_URL` at the managed instance and drop the `postgres` service from compose. |
| **Vercel** | Deploy `apps/web` as the front end and `apps/server` as a separate service. Set `VITE_SERVER_URL` to the API origin. |
| **Cloudflare Workers** | Needs `--runtime workers`; some Node APIs and the `pg` driver are unavailable. Expect real changes, not just config. |

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:
it starts a Postgres service, writes the env files, applies migrations, then
runs `bun run verify` — the same command you run locally.

There is no deploy step. Add one once you have somewhere to deploy to.
