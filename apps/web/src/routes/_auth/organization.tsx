/**
 * Organization management: profile, members, invitations.
 *
 * Permissions are enforced on the server by Better Auth. The UI hides what the
 * current member cannot do, but that is a courtesy — never the control.
 */
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@boilerslate/ui/components/alert-dialog";
import { Avatar, AvatarFallback } from "@boilerslate/ui/components/avatar";
import { Badge } from "@boilerslate/ui/components/badge";
import { Button } from "@boilerslate/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@boilerslate/ui/components/card";
import { Empty } from "@boilerslate/ui/components/empty";
import { Input } from "@boilerslate/ui/components/input";
import { Label } from "@boilerslate/ui/components/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@boilerslate/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@boilerslate/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, LogOut, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/organization")({
	component: RouteComponent,
});

const ROLES = ["owner", "admin", "member"] as const;
type Role = (typeof ROLES)[number];

/** Only owners and admins may manage members. */
function canManage(role: string | undefined) {
	return role === "owner" || role === "admin";
}

function initials(value: string) {
	return value.slice(0, 2).toUpperCase();
}

function RenameCard({
	organizationId,
	currentName,
	currentSlug,
	disabled,
	onSaved,
}: {
	organizationId: string;
	currentName: string;
	currentSlug: string;
	disabled: boolean;
	onSaved: () => void;
}) {
	const [name, setName] = useState(currentName);
	const [slug, setSlug] = useState(currentSlug);
	const [pending, setPending] = useState(false);

	async function save() {
		setPending(true);
		const { error } = await authClient.organization.update({
			organizationId,
			data: { name: name.trim(), slug: slug.trim() },
		});
		setPending(false);
		if (error) {
			toast.error(error.message ?? "Could not update the organization.");
			return;
		}
		toast.success("Organization updated");
		onSaved();
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Profile</CardTitle>
				<CardDescription>The organization's name and URL slug.</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-1.5">
					<Label htmlFor="org-name">Name</Label>
					<Input
						id="org-name"
						value={name}
						disabled={disabled}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>
				<div className="grid gap-1.5">
					<Label htmlFor="org-slug">Slug</Label>
					<Input
						id="org-slug"
						value={slug}
						disabled={disabled}
						onChange={(e) => setSlug(e.target.value)}
					/>
				</div>
			</CardContent>
			<CardFooter>
				<Button
					size="sm"
					disabled={disabled || pending || !name.trim() || !slug.trim()}
					onClick={save}
				>
					{pending ? "Saving…" : "Save changes"}
				</Button>
			</CardFooter>
		</Card>
	);
}

function InviteForm({ onInvited }: { onInvited: (id: string) => void }) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Role>("member");
	const [pending, setPending] = useState(false);

	async function invite() {
		if (!email.trim()) return;
		setPending(true);
		const { data, error } = await authClient.organization.inviteMember({
			email: email.trim(),
			role,
		});
		setPending(false);

		if (error) {
			toast.error(error.message ?? "Could not send the invitation.");
			return;
		}
		setEmail("");
		toast.success(`Invitation created for ${email.trim()}`);
		if (data?.id) onInvited(data.id);
	}

	return (
		<div className="flex flex-wrap items-end gap-2">
			<div className="grid min-w-56 flex-1 gap-1.5">
				<Label htmlFor="invite-email">Email</Label>
				<Input
					id="invite-email"
					type="email"
					value={email}
					placeholder="teammate@example.com"
					onChange={(e) => setEmail(e.target.value)}
				/>
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="invite-role">Role</Label>
				<Select value={role} onValueChange={(v) => setRole(v as Role)}>
					<SelectTrigger id="invite-role" className="w-36">
						<SelectValue>{role}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{ROLES.map((r) => (
								<SelectItem key={r} value={r}>
									{r}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
			<Button disabled={pending || !email.trim()} onClick={invite}>
				<UserPlus className="size-4" />
				{pending ? "Inviting…" : "Invite"}
			</Button>
		</div>
	);
}

function RouteComponent() {
	const { data: organization, isPending } = authClient.useActiveOrganization();
	const { data: activeMember } = authClient.useActiveMember();
	const { data: session } = authClient.useSession();

	const [lastInviteId, setLastInviteId] = useState<string | null>(null);

	const role = activeMember?.role;
	const manage = canManage(role);

	function refresh() {
		// The reactive atoms refetch when the active organization signal changes;
		// re-setting it is the documented way to nudge them.
		if (organization?.id) {
			authClient.organization.setActive({ organizationId: organization.id });
		}
	}

	if (isPending) {
		return (
			<div className="mx-auto w-full max-w-4xl">
				<Card>
					<CardHeader>
						<CardTitle>Organization</CardTitle>
						<CardDescription>Loading…</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (!organization) {
		return (
			<div className="mx-auto w-full max-w-4xl">
				<Card>
					<CardContent className="pt-6">
						<Empty>
							<Users className="size-6 text-muted-foreground" />
							<p className="font-medium">No organization selected</p>
							<p className="text-muted-foreground text-sm">
								Use the switcher at the top of the sidebar to create or choose
								one.
							</p>
						</Empty>
					</CardContent>
				</Card>
			</div>
		);
	}

	const members = organization.members ?? [];
	const invitations = (organization.invitations ?? []).filter(
		(i) => i.status === "pending",
	);
	const inviteLink = lastInviteId
		? `${window.location.origin}/accept-invitation/${lastInviteId}`
		: null;

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						{organization.name}
					</h1>
					<p className="text-muted-foreground text-sm">
						/{organization.slug} · you are {role ?? "a member"}
					</p>
				</div>
			</div>

			<RenameCard
				// Keyed so switching organization remounts the form. Without this
				// its useState keeps the previous organization's name and slug,
				// and "Save changes" would rename the wrong organization.
				key={organization.id}
				organizationId={organization.id}
				currentName={organization.name}
				currentSlug={organization.slug}
				disabled={role !== "owner"}
				onSaved={refresh}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Members</CardTitle>
					<CardDescription>
						{members.length} {members.length === 1 ? "member" : "members"} in
						this organization.
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Member</TableHead>
								<TableHead>Role</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => {
								const isSelf = member.userId === session?.user.id;
								return (
									<TableRow key={member.id}>
										<TableCell>
											<div className="flex items-center gap-2">
												<Avatar className="size-7">
													<AvatarFallback className="text-[10px]">
														{initials(
															member.user?.name ?? member.user?.email ?? "?",
														)}
													</AvatarFallback>
												</Avatar>
												<div className="grid leading-tight">
													<span className="font-medium">
														{member.user?.name}
														{isSelf && (
															<span className="ml-1.5 text-muted-foreground text-xs">
																you
															</span>
														)}
													</span>
													<span className="text-muted-foreground text-xs">
														{member.user?.email}
													</span>
												</div>
											</div>
										</TableCell>

										<TableCell>
											{manage && !isSelf ? (
												<Select
													value={member.role}
													onValueChange={async (value) => {
														const { error } =
															await authClient.organization.updateMemberRole({
																memberId: member.id,
																role: value as Role,
															});
														if (error) {
															toast.error(
																error.message ?? "Could not change role.",
															);
															return;
														}
														toast.success("Role updated");
														refresh();
													}}
												>
													<SelectTrigger size="sm" className="w-32">
														<SelectValue>{member.role}</SelectValue>
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															{ROLES.map((r) => (
																<SelectItem key={r} value={r}>
																	{r}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
											) : (
												<Badge variant="secondary">{member.role}</Badge>
											)}
										</TableCell>

										<TableCell className="text-right">
											{manage && !isSelf && (
												<AlertDialog>
													<AlertDialogTrigger
														render={<Button variant="ghost" size="icon-sm" />}
													>
														<Trash2 className="size-4" />
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Remove {member.user?.name}?
															</AlertDialogTitle>
															<AlertDialogDescription>
																They lose access to this organization's data
																immediately.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancel</AlertDialogCancel>
															<AlertDialogAction
																onClick={async () => {
																	const { error } =
																		await authClient.organization.removeMember({
																			memberIdOrEmail: member.id,
																		});
																	if (error) {
																		toast.error(
																			error.message ??
																				"Could not remove member.",
																		);
																		return;
																	}
																	toast.success("Member removed");
																	refresh();
																}}
															>
																Remove
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>

				{role !== "owner" && (
					<CardFooter className="border-t bg-transparent">
						<Button
							variant="ghost"
							size="sm"
							onClick={async () => {
								const { error } = await authClient.organization.leave({
									organizationId: organization.id,
								});
								if (error) {
									toast.error(error.message ?? "Could not leave.");
									return;
								}
								toast.success("You left the organization");
								window.location.reload();
							}}
						>
							<LogOut className="size-4" />
							Leave organization
						</Button>
					</CardFooter>
				)}
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Invitations</CardTitle>
					<CardDescription>
						No email is configured yet, so share the invite link yourself.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{manage ? (
						<InviteForm onInvited={setLastInviteId} />
					) : (
						<p className="text-muted-foreground text-sm">
							Only owners and admins can invite people.
						</p>
					)}

					{inviteLink && (
						<div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
							<Mail className="size-4 shrink-0 text-muted-foreground" />
							<code className="min-w-0 flex-1 truncate text-xs">
								{inviteLink}
							</code>
							<Button
								size="sm"
								variant="outline"
								onClick={async () => {
									try {
										await navigator.clipboard.writeText(inviteLink);
										toast.success("Link copied");
									} catch {
										toast.error("Could not copy — select the link manually.");
									}
								}}
							>
								<Copy className="size-4" />
								Copy
							</Button>
						</div>
					)}

					{invitations.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No pending invitations.
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invitations.map((invitation) => (
										<TableRow key={invitation.id}>
											<TableCell>{invitation.email}</TableCell>
											<TableCell>
												<Badge variant="outline">{invitation.role}</Badge>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-1">
													<Button
														size="sm"
														variant="ghost"
														onClick={() => setLastInviteId(invitation.id)}
													>
														Link
													</Button>
													{manage && (
														<Button
															size="sm"
															variant="ghost"
															onClick={async () => {
																const { error } =
																	await authClient.organization.cancelInvitation(
																		{
																			invitationId: invitation.id,
																		},
																	);
																if (error) {
																	toast.error(
																		error.message ?? "Could not cancel.",
																	);
																	return;
																}
																toast.success("Invitation cancelled");
																refresh();
															}}
														>
															Cancel
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
