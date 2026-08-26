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

## The UI

| Where | What |
| --- | --- |
| `/select-organization` | Post-login chooser, shown when the session has no active organization |
| Sidebar header | Organization switcher — list, switch, create |
| `/organization` | Profile (owner only), members with role management, teams, invitations |
| `/accept-invitation/$invitationId` | Public accept/decline page |

The chooser lives **outside** the `_auth` layout on purpose: that layout
redirects there when no organization is active, so nesting it would make the
two bounce off each other forever. With exactly one organization it selects it
and moves on rather than asking a pointless question.

Switching sets the active organization **on the session**, server-side, so it
changes what every organization-scoped procedure can see. The switcher
invalidates queries and the router afterwards for that reason.

The management page hides actions the current member cannot perform, but that
is a courtesy — Better Auth enforces permissions on the server, and the tests
in `apps/server/src/index.test.ts` prove it: a plain member cannot invite,
cannot remove anyone, and cannot promote themselves to owner.

## Invitations without email

There is no email sending yet, so an invitation is not delivered — the UI shows
the accept link and a copy button instead, and every pending invitation has a
"Link" action to recover it.

The link is `/accept-invitation/<invitationId>`. The invited person must sign in
with the address the invitation was sent to; the server refuses otherwise
("You are not the recipient of the invitation").

Wire up an email provider and Better Auth will send these itself — see
`sendInvitationEmail` in the organization plugin options.

## Teams

Sub-groups within an organization, enabled in `packages/auth/src/index.ts`.
Teams group people — they do **not** carry their own permissions in this
configuration. Organization roles still decide what someone may do; a team is a
label for "who works on what", not an access boundary.

Two settings there are deliberate and paired:

- `defaultTeam: { enabled: false }` — a new organization starts with no teams,
  because most projects do not need them.
- `allowRemovingAllTeams: true` — follows from the above. Better Auth otherwise
  refuses to delete the *last* team, which would make the first team anyone
  creates permanently undeletable.

Enabling teams also adds `invitation.teamId`, so an invitation can drop someone
straight onto a team.

### A constraint worth knowing

`list-team-members` requires the **caller** to be on that team. An owner who is
not a member cannot read its roster — the API returns an error, not an empty
list. `TeamsCard` handles that explicitly; without it the panel would sit on
"Loading members…" forever.

That endpoint also returns rows with no joined user, so the UI resolves names
from the organization roster it already has.

## Still missing

- Email delivery for invitations
- Custom roles beyond `owner` / `admin` / `member`
