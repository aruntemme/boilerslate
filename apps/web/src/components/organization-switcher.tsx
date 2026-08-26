/**
 * Organization switcher for the sidebar header.
 *
 * Switching sets the active organization on the *session*, server-side — every
 * organization-scoped procedure reads it from there, so a switch changes what
 * the whole app can see. Queries are invalidated on switch for that reason.
 */
import { Avatar, AvatarFallback } from "@boilerslate/ui/components/avatar";
import { Button } from "@boilerslate/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@boilerslate/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@boilerslate/ui/components/dropdown-menu";
import { Input } from "@boilerslate/ui/components/input";
import { Label } from "@boilerslate/ui/components/label";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@boilerslate/ui/components/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Plus, Squircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

/** "Acme Inc" -> "acme-inc" */
function slugify(name: string) {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
}

function CreateOrganizationDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: () => void;
}) {
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugTouched, setSlugTouched] = useState(false);
	const [pending, setPending] = useState(false);

	const effectiveSlug = slugTouched ? slug : slugify(name);

	async function submit() {
		if (!name.trim() || !effectiveSlug) return;
		setPending(true);
		const { data, error } = await authClient.organization.create({
			name: name.trim(),
			slug: effectiveSlug,
		});
		setPending(false);

		if (error) {
			toast.error(error.message ?? "Could not create the organization.");
			return;
		}
		if (data) {
			// Creating does not make it active; do that explicitly so the new
			// organization is the one you are looking at.
			await authClient.organization.setActive({ organizationId: data.id });
		}
		toast.success(`${name.trim()} created`);
		setName("");
		setSlug("");
		setSlugTouched(false);
		onOpenChange(false);
		onCreated();
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New organization</DialogTitle>
					<DialogDescription>
						Members, data and AI providers are all scoped to an organization.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-3">
					<div className="grid gap-1.5">
						<Label htmlFor="org-name">Name</Label>
						<Input
							id="org-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Acme Inc"
						/>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="org-slug">Slug</Label>
						<Input
							id="org-slug"
							value={effectiveSlug}
							onChange={(e) => {
								setSlugTouched(true);
								setSlug(slugify(e.target.value));
							}}
							placeholder="acme-inc"
						/>
						<p className="text-muted-foreground text-xs">
							Must be unique across all organizations.
						</p>
					</div>
				</div>

				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>
						Cancel
					</DialogClose>
					<Button onClick={submit} disabled={pending || !name.trim()}>
						{pending ? "Creating…" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function OrganizationSwitcher() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: organizations } = authClient.useListOrganizations();
	const { data: active } = authClient.useActiveOrganization();
	const [createOpen, setCreateOpen] = useState(false);

	async function refresh() {
		// The active organization lives on the session, so anything scoped to it
		// is now stale.
		await queryClient.invalidateQueries();
		await router.invalidate();
	}

	async function switchTo(organizationId: string) {
		if (organizationId === active?.id) return;
		const { error } = await authClient.organization.setActive({
			organizationId,
		});
		if (error) {
			toast.error(error.message ?? "Could not switch organization.");
			return;
		}
		await refresh();
	}

	const list = organizations ?? [];

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Squircle className="size-4" />
							</div>
							<div className="grid flex-1 text-left leading-tight">
								<span className="truncate font-semibold">
									{active?.name ?? "No organization"}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{active ? `${list.length} available` : "Create one to start"}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</DropdownMenuTrigger>

						<DropdownMenuContent align="start" className="w-64">
							<DropdownMenuGroup>
								<DropdownMenuLabel>Organizations</DropdownMenuLabel>
							</DropdownMenuGroup>

							{list.length === 0 && (
								<div className="px-2 py-1.5 text-muted-foreground text-sm">
									None yet.
								</div>
							)}

							{list.map((org) => (
								<DropdownMenuItem key={org.id} onClick={() => switchTo(org.id)}>
									<Avatar className="size-5 rounded">
										<AvatarFallback className="rounded text-[10px]">
											{org.name.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<span className="truncate">{org.name}</span>
									{org.id === active?.id && (
										<Check className="ml-auto size-4 shrink-0" />
									)}
								</DropdownMenuItem>
							))}

							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => setCreateOpen(true)}>
								<Plus className="size-4" />
								New organization
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>

			<CreateOrganizationDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onCreated={refresh}
			/>
		</>
	);
}
