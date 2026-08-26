# Multi-tenancy

Users belong to organizations, via Better Auth's
[organization plugin](https://better-auth.com/docs/plugins/organization).

## Model

| Table | Holds |
| --- | --- |
| `user` | The person |
| `organization` | The tenant, with a unique `slug` |
| `member` | The join, with a `role` |
| `invitation` | Pending invites, with an expiry |

`session.activeOrganizationId` tracks which tenant the user is currently acting
in. Roles are `owner`, `admin`, `member`; the creator becomes `owner`.

Limits are set in `packages/auth/src/index.ts`: 5 organizations per user, 100
members per organization, invitations expiring after 48 hours. Change them
there.

## Using it

```ts
await authClient.organization.create({ name: "Acme Inc", slug: "acme" });
await authClient.organization.list();
await authClient.organization.inviteMember({ email, role: "member" });
await authClient.organization.setActive({ organizationId });
```

The client plugin is registered in `apps/web/src/lib/auth-client.ts`, so
`authClient.organization.*` is fully typed.

## The rule you must not forget

**Better Auth scopes its own endpoints. It does not scope yours.**

Any oRPC procedure that returns tenant data must filter by the caller's
organization itself. Nothing enforces this for you, and a missing filter is a
data leak between customers, not a bug report.

```ts
// Wrong — returns every tenant's projects.
export const listProjects = protectedProcedure.handler(({ context }) =>
  db.select().from(project),
);

// Right — scoped to the caller's active organization.
export const listProjects = protectedProcedure.handler(({ context }) => {
  const orgId = context.session?.session.activeOrganizationId;
  if (!orgId) throw new ORPCError("FORBIDDEN");
  return db.select().from(project).where(eq(project.organizationId, orgId));
});
```

Every tenant-scoped procedure should ship with a test proving a non-member gets
a 403. The pattern is in `apps/server/src/index.test.ts` under
`"isolates tenants"` — it creates an organization as one user, then asserts a
second user sees nothing and is refused even when naming the organization id
directly.

## What is not built yet

There is no organization UI — no create form, no member list, no invite flow,
no tenant switcher. The API works and is tested; the screens are not written.
