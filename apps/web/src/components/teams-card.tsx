/**
 * Teams: sub-groups within an organization.
 *
 * Teams group members; they do not carry their own permissions in the default
 * configuration. Organization roles still decide what someone may do — a team
 * is a label for "who works on what", not an access boundary.
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
import { Separator } from "@boilerslate/ui/components/separator";
import { Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface TeamRow {
	id: string;
	name: string;
	memberCount?: number;
}

interface TeamMemberRow {
	id: string;
	userId: string;
	user?: { name?: string; email?: string };
}

interface OrganizationMember {
	id: string;
	userId: string;
	user?: { name?: string; email?: string } | null;
}

function initials(value: string) {
	return value.slice(0, 2).toUpperCase();
}

function TeamPanel({
	team,
	organizationMembers,
	canManage,
	onChanged,
}: {
	team: TeamRow;
	organizationMembers: OrganizationMember[];
	canManage: boolean;
	onChanged: () => void;
}) {
	const [members, setMembers] = useState<TeamMemberRow[] | null>(null);
	const [rosterHidden, setRosterHidden] = useState(false);
	const [addUserId, setAddUserId] = useState("");
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		const { data, error } = await authClient.organization.listTeamMembers({
			query: { teamId: team.id },
		});
		// Better Auth only lets members of a team read its roster — an owner who
		// is not on the team gets an error, not an empty list. Without this the
		// panel would sit on "Loading members…" forever.
		if (error) {
			setRosterHidden(true);
			setMembers([]);
			return;
		}
		setRosterHidden(false);
		setMembers((data ?? []) as TeamMemberRow[]);
	}, [team.id]);

	useEffect(() => {
		load();
	}, [load]);

	// Only offer people who are in the organization but not already on the team.
	const inTeam = new Set((members ?? []).map((m) => m.userId));
	const addable = organizationMembers.filter((m) => !inTeam.has(m.userId));
	const userById = new Map(
		organizationMembers.map((m) => [m.userId, m.user ?? null]),
	);

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex flex-wrap items-center gap-2">
				<Users className="size-4 text-muted-foreground" />
				<span className="font-medium">{team.name}</span>
				<Badge variant="secondary">
					{rosterHidden ? (team.memberCount ?? 0) : (members?.length ?? 0)}
				</Badge>

				{canManage && (
					<div className="ml-auto">
						<AlertDialog>
							<AlertDialogTrigger
								render={<Button variant="ghost" size="icon-sm" />}
							>
								<Trash2 className="size-4" />
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete {team.name}?</AlertDialogTitle>
									<AlertDialogDescription>
										The team is removed. Its members stay in the organization.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={async () => {
											const { error } =
												await authClient.organization.removeTeam({
													teamId: team.id,
												});
											if (error) {
												toast.error(error.message ?? "Could not delete team.");
												return;
											}
											toast.success("Team deleted");
											onChanged();
										}}
									>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)}
			</div>

			{members === null ? (
				<p className="text-muted-foreground text-sm">Loading members…</p>
			) : rosterHidden ? (
				<p className="text-muted-foreground text-sm">
					You are not on this team, so its members are not visible to you.
				</p>
			) : members.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nobody on this team yet.
				</p>
			) : (
				<div className="flex flex-col gap-1.5">
					{members.map((member) => {
						// list-team-members returns rows with no joined user, so names come
						// from the organization roster we already have.
						const user = userById.get(member.userId) ?? member.user ?? null;
						const label = user?.name ?? user?.email ?? "Unknown member";
						return (
							<div key={member.id} className="flex items-center gap-2">
								<Avatar className="size-6">
									<AvatarFallback className="text-[10px]">
										{initials(label)}
									</AvatarFallback>
								</Avatar>
								<span className="text-sm">{label}</span>
								<span className="text-muted-foreground text-xs">
									{user?.email}
								</span>
								{canManage && (
									<Button
										variant="ghost"
										size="icon-sm"
										className="ml-auto"
										aria-label={`Remove ${label}`}
										onClick={async () => {
											const { error } =
												await authClient.organization.removeTeamMember({
													teamId: team.id,
													userId: member.userId,
												});
											if (error) {
												toast.error(error.message ?? "Could not remove.");
												return;
											}
											toast.success("Removed from team");
											await load();
											onChanged();
										}}
									>
										<UserMinus className="size-4" />
									</Button>
								)}
							</div>
						);
					})}
				</div>
			)}

			{canManage && addable.length > 0 && (
				<div className="flex flex-wrap items-end gap-2">
					<div className="grid min-w-48 flex-1 gap-1.5">
						<Label htmlFor={`add-${team.id}`}>Add a member</Label>
						<Select
							value={addUserId}
							onValueChange={(v) => setAddUserId(String(v))}
						>
							<SelectTrigger id={`add-${team.id}`} size="sm">
								<SelectValue>
									{addable.find((m) => m.userId === addUserId)?.user?.name ??
										"Choose someone"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{addable.map((m) => (
										<SelectItem key={m.userId} value={m.userId}>
											{m.user?.name ?? m.user?.email ?? m.userId}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					<Button
						size="sm"
						variant="outline"
						disabled={!addUserId || busy}
						onClick={async () => {
							setBusy(true);
							const { error } = await authClient.organization.addTeamMember({
								teamId: team.id,
								userId: addUserId,
							});
							setBusy(false);
							if (error) {
								toast.error(error.message ?? "Could not add to team.");
								return;
							}
							setAddUserId("");
							toast.success("Added to team");
							await load();
							onChanged();
						}}
					>
						<UserPlus className="size-4" />
						Add
					</Button>
				</div>
			)}
		</div>
	);
}

export function TeamsCard({
	organizationId,
	organizationMembers,
	canManage,
	onChanged,
}: {
	organizationId: string;
	organizationMembers: OrganizationMember[];
	canManage: boolean;
	onChanged: () => void;
}) {
	const [teams, setTeams] = useState<TeamRow[] | null>(null);
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		const { data } = await authClient.organization.listTeams({
			query: { organizationId },
		});
		setTeams((data ?? []) as TeamRow[]);
	}, [organizationId]);

	useEffect(() => {
		load();
	}, [load]);

	async function create() {
		const trimmed = name.trim();
		if (!trimmed) return;
		setBusy(true);
		const { error } = await authClient.organization.createTeam({
			name: trimmed,
			organizationId,
		});
		setBusy(false);
		if (error) {
			toast.error(error.message ?? "Could not create the team.");
			return;
		}
		setName("");
		toast.success(`${trimmed} created`);
		await load();
		onChanged();
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Teams</CardTitle>
				<CardDescription>
					Sub-groups within this organization. Teams group people; organization
					roles still decide what they can do.
				</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				{teams === null ? (
					<p className="text-muted-foreground text-sm">Loading teams…</p>
				) : teams.length === 0 ? (
					<Empty>
						<Users className="size-6 text-muted-foreground" />
						<p className="font-medium">No teams yet</p>
						<p className="text-muted-foreground text-sm">
							Create one below to group members by what they work on.
						</p>
					</Empty>
				) : (
					<div className="flex flex-col gap-3">
						{teams.map((team) => (
							<TeamPanel
								key={team.id}
								team={team}
								organizationMembers={organizationMembers}
								canManage={canManage}
								onChanged={() => {
									load();
									onChanged();
								}}
							/>
						))}
					</div>
				)}

				{canManage && (
					<>
						<Separator />
						<div className="flex flex-wrap items-end gap-2">
							<div className="grid min-w-48 flex-1 gap-1.5">
								<Label htmlFor="team-name">New team</Label>
								<Input
									id="team-name"
									value={name}
									placeholder="Engineering"
									onChange={(e) => setName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") create();
									}}
								/>
							</div>
							<Button disabled={busy || !name.trim()} onClick={create}>
								{busy ? "Creating…" : "Create team"}
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
