import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);

/**
 * Requires an active organization on top of a session.
 *
 * The organization id comes from the server-side session, never from the
 * request body — a client-supplied tenant id is the classic multi-tenant
 * data-leak bug.
 */
const requireOrganization = o.middleware(async ({ context, next }) => {
	const organizationId = context.session?.session.activeOrganizationId;
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	if (!organizationId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Select an organization first.",
		});
	}
	return next({
		context: {
			session: context.session,
			organizationId,
		},
	});
});

export const organizationProcedure = publicProcedure.use(requireOrganization);
