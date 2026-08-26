# Architecture

## Shape

```
apps/
  web/      TanStack Start — React with SSR and typed file-based routing
  server/   Hono on Bun — mounts auth at /api/auth and oRPC at /rpc
packages/
  api/      oRPC routers and request context
  auth/     Better Auth configuration (server side)
  db/       Drizzle schema, migrations, connection
  env/      Zod-validated environment variables
  ui/       shadcn components, styles, themes, AI primitives
  config/   shared tsconfig
```

Turborepo runs the tasks; Bun workspaces resolve the packages.

## Why two apps and not one

The web app could have hosted the API through TanStack Start's server routes.
Keeping Hono separate means the API can be deployed, scaled and consumed on its
own — by a mobile client, a cron worker, or a third party — without unpicking it
from a rendering framework later. The cost is one extra process in development.

## Type safety, end to end

```
Drizzle schema  →  Better Auth  →  oRPC router  →  TanStack Query client
```

Types are inferred along that whole chain. There is no code generation step and
no DTO layer to keep in sync. If you find yourself hand-writing a type that
already exists upstream, infer it instead.

`packages/api` holds the procedures. `apps/server` only wires transport —
adding an endpoint means adding a procedure in `packages/api/src/routers/`, not
touching the Hono app.

## Request path

1. Browser calls the typed oRPC client (`apps/web/src/utils/orpc.ts`).
2. Hono receives it at `/rpc/<procedure>`.
3. `createContext` resolves the Better Auth session from the cookie.
4. `protectedProcedure` rejects with 401 when there is no session.
5. The procedure runs, returning a typed value straight to the client.

Better Auth's own endpoints (`/api/auth/*`) are mounted before the oRPC handler
and are not part of the oRPC router.

## Environment variables

Declared as a Zod schema in `packages/env/src/{server,web}.ts` and validated at
boot. A missing variable fails on startup with a readable message rather than
at 3am as `undefined`. Reading `process.env` directly anywhere else is a bug.

Web variables must be prefixed `VITE_` to reach the browser.

## Database

Drizzle, with **migrations** rather than `db:push`. Change the schema, run
`bun run db:generate`, and commit the SQL it writes to
`packages/db/src/migrations/`. Never edit a migration that has been applied
anywhere but your own machine — add a new one.

`db:push` exists for throwaway local experiments. It leaves no migration
behind, so it must never be used against an environment you care about.

## Testing

`apps/server/src/index.test.ts` runs the real Hono app against the real
Postgres. Nothing is mocked and nothing is stubbed: signup, sessions,
authorization and tenant isolation are all exercised against the database.

That is deliberate. A test that mocks the thing under test cannot fail when the
feature breaks, which makes it worse than no test at all.
