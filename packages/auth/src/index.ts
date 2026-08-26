import { createDb } from "@boilerslate/db";
import * as schema from "@boilerslate/db/schema/auth";
import { env } from "@boilerslate/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [
			// Multi-tenancy: users belong to organizations with roles and invites.
			// Docs: https://better-auth.com/docs/plugins/organization
			organization({
				allowUserToCreateOrganization: true,
				organizationLimit: 5,
				membershipLimit: 100,
				creatorRole: "owner",
				invitationExpiresIn: 60 * 60 * 48, // 48 hours
				// Teams are sub-groups within an organization. Enabling adds the
				// `team` and `team_member` tables — see docs/multi-tenancy.md.
				teams: {
					enabled: true,
					// Do not auto-create a "General" team; an organization with no
					// teams is a valid state and the UI handles it.
					defaultTeam: { enabled: false },
					maximumTeams: 20,
					// Consistent with defaultTeam being off: zero teams is a valid
					// state, so the last team must be deletable. Otherwise the first
					// team anyone creates can never be removed.
					allowRemovingAllTeams: true,
				},
			}),
		],
	});
}

export const auth = createAuth();
