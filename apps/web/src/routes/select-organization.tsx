/**
 * Organization chooser, shown after sign-in when the session has no active
 * organization.
 *
 * Deliberately outside `_auth`: that layout redirects here when no
 * organization is active, so if this route lived under it the two would
 * bounce off each other forever.
 *
 * With exactly one organization there is nothing to choose — it selects it and
 * moves on rather than asking a pointless question.
 */
import { Avatar, AvatarFallback } from "@boilerslate/ui/components/avatar";
import { Button } from "@boilerslate/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@boilerslate/ui/components/card";
import { Input } from "@boilerslate/ui/components/input";
import { Label } from "@boilerslate/ui/components/label";
import { Separator } from "@boilerslate/ui/components/separator";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/select-organization")({
	ssr: false,
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		// Already chosen — nothing to do here.
		if (session.data.session.activeOrganizationId) {
			throw redirect({ to: "/dashboard" });
		}
	},
});

function slugify(name: string) {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
}

function RouteComponent() {
	const navigate = useNavigate();
	const [organizations, setOrganizations] = useState<
		{ id: string; name: string; slug: string }[] | null
	>(null);
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);

	async function choose(organizationId: string) {
		setBusy(true);
		const { error } = await authClient.organization.setActive({
			organizationId,
		});
		if (error) {
			setBusy(false);
			toast.error(error.message ?? "Could not select that organization.");
			return;
		}
		navigate({ to: "/dashboard" });
	}

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const { data } = await authClient.organization.list();
			if (cancelled) return;

			const list = data ?? [];
			// One organization is not a choice — pick it and move on.
			if (list.length === 1 && list[0]) {
				await authClient.organization.setActive({
					organizationId: list[0].id,
				});
				navigate({ to: "/dashboard" });
				return;
			}
			setOrganizations(list);
		})();
		return () => {
			cancelled = true;
		};
	}, [navigate]);

	async function create() {
		const trimmed = name.trim();
		if (!trimmed) return;
		setBusy(true);

		const { data, error } = await authClient.organization.create({
			name: trimmed,
			slug: slugify(trimmed),
		});
		if (error || !data) {
			setBusy(false);
			toast.error(error?.message ?? "Could not create the organization.");
			return;
		}
		await authClient.organization.setActive({ organizationId: data.id });
		toast.success(`${trimmed} created`);
		navigate({ to: "/dashboard" });
	}

	if (organizations === null) {
		return (
			<div className="flex min-h-svh items-center justify-center px-4">
				<p className="text-muted-foreground text-sm">Loading…</p>
			</div>
		);
	}

	const hasAny = organizations.length > 0;

	return (
		<div className="flex min-h-svh items-center justify-center px-4 py-10">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>
						{hasAny ? "Choose an organization" : "Create your organization"}
					</CardTitle>
					<CardDescription>
						{hasAny
							? "Your data, members and AI providers are scoped to whichever one you pick. You can switch at any time."
							: "Everything in the app lives inside an organization. Name yours to get started."}
					</CardDescription>
				</CardHeader>

				<CardContent className="flex flex-col gap-4">
					{hasAny && (
						<>
							<div className="flex flex-col gap-2">
								{organizations.map((org) => (
									<button
										key={org.id}
										type="button"
										disabled={busy}
										onClick={() => choose(org.id)}
										className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
									>
										<Avatar className="size-8 rounded-lg">
											<AvatarFallback className="rounded-lg text-xs">
												{org.name.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<span className="grid flex-1 leading-tight">
											<span className="font-medium">{org.name}</span>
											<span className="text-muted-foreground text-xs">
												/{org.slug}
											</span>
										</span>
										<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
									</button>
								))}
							</div>
							<Separator />
						</>
					)}

					<div className="grid gap-1.5">
						<Label htmlFor="new-org">
							{hasAny ? "Or create a new one" : "Organization name"}
						</Label>
						<Input
							id="new-org"
							value={name}
							placeholder="Acme Inc"
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") create();
							}}
						/>
						{name.trim() && (
							<p className="text-muted-foreground text-xs">
								URL: /{slugify(name)}
							</p>
						)}
					</div>

					<Button onClick={create} disabled={busy || !name.trim()}>
						<Plus className="size-4" />
						{busy ? "Working…" : "Create organization"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
