/**
 * Invitation acceptance.
 *
 * Public route: the person following the link may not have an account yet. If
 * they are signed out we send them to /login first and come back — the
 * invitation is bound to an email, and the server checks it matches.
 */
import { Button } from "@boilerslate/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@boilerslate/ui/components/card";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/accept-invitation/$invitationId")({
	ssr: false,
	component: RouteComponent,
});

interface InvitationSummary {
	organizationName: string;
	email: string;
	role: string;
}

function RouteComponent() {
	const { invitationId } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const [invitation, setInvitation] = useState<InvitationSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [acting, setActing] = useState(false);

	useEffect(() => {
		if (sessionPending) return;
		// getInvitation requires a session — the server matches the invited
		// address against the signed-in user.
		if (!session) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		(async () => {
			const { data, error: fetchError } =
				await authClient.organization.getInvitation({
					query: { id: invitationId },
				});
			if (cancelled) return;

			if (fetchError || !data) {
				setError(
					fetchError?.message ??
						"This invitation is not valid, has expired, or was sent to a different email address.",
				);
			} else {
				setInvitation({
					organizationName: data.organizationName,
					email: data.email,
					role: data.role,
				});
			}
			setLoading(false);
		})();

		return () => {
			cancelled = true;
		};
	}, [invitationId, session, sessionPending]);

	async function accept() {
		setActing(true);
		const { data, error: acceptError } =
			await authClient.organization.acceptInvitation({ invitationId });
		setActing(false);

		if (acceptError) {
			toast.error(acceptError.message ?? "Could not accept the invitation.");
			return;
		}
		if (data?.invitation.organizationId) {
			await authClient.organization.setActive({
				organizationId: data.invitation.organizationId,
			});
		}
		toast.success("Invitation accepted");
		navigate({ to: "/organization" });
	}

	async function reject() {
		setActing(true);
		const { error: rejectError } =
			await authClient.organization.rejectInvitation({ invitationId });
		setActing(false);

		if (rejectError) {
			toast.error(rejectError.message ?? "Could not decline.");
			return;
		}
		toast.success("Invitation declined");
		navigate({ to: "/" });
	}

	return (
		<div className="flex min-h-svh items-center justify-center px-4">
			<Card className="w-full max-w-md">
				{sessionPending || loading ? (
					<CardHeader>
						<CardTitle>Invitation</CardTitle>
						<CardDescription>Checking your invitation…</CardDescription>
					</CardHeader>
				) : !session ? (
					<>
						<CardHeader>
							<CardTitle>Sign in to continue</CardTitle>
							<CardDescription>
								You need an account before you can join an organization. Sign in
								with the address the invitation was sent to, then open this link
								again.
							</CardDescription>
						</CardHeader>
						<CardFooter>
							<Button render={<Link to="/login" />}>Sign in</Button>
						</CardFooter>
					</>
				) : error ? (
					<>
						<CardHeader>
							<CardTitle>Invitation unavailable</CardTitle>
							<CardDescription>{error}</CardDescription>
						</CardHeader>
						<CardFooter>
							<Button variant="outline" render={<Link to="/" />}>
								Go home
							</Button>
						</CardFooter>
					</>
				) : invitation ? (
					<>
						<CardHeader>
							<CardTitle>Join {invitation.organizationName}</CardTitle>
							<CardDescription>
								You were invited as <strong>{invitation.role}</strong> at{" "}
								{invitation.email}.
							</CardDescription>
						</CardHeader>
						<CardContent className="text-muted-foreground text-sm">
							Accepting gives you access to this organization's data.
						</CardContent>
						<CardFooter className="gap-2">
							<Button onClick={accept} disabled={acting}>
								{acting ? "Joining…" : "Accept"}
							</Button>
							<Button variant="ghost" onClick={reject} disabled={acting}>
								Decline
							</Button>
						</CardFooter>
					</>
				) : null}
			</Card>
		</div>
	);
}
