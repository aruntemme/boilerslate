/**
 * The application shell shown to signed-in users.
 * Navigation lives in NAV_ITEMS — add a route there and it appears here.
 */
import { Avatar, AvatarFallback } from "@boilerslate/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@boilerslate/ui/components/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@boilerslate/ui/components/sidebar";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	ChevronsUpDown,
	LayoutDashboard,
	LogOut,
	Settings,
	Squircle,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const NAV_ITEMS = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/settings", label: "Settings", icon: Settings },
] as const;

function initials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function AppSidebar() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	const user = session?.user;

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" render={<Link to="/dashboard" />}>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Squircle className="size-4" />
							</div>
							<div className="grid flex-1 text-left leading-tight">
								<span className="truncate font-semibold">Boilerslate</span>
								<span className="truncate text-muted-foreground text-xs">
									Starter workspace
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAV_ITEMS.map(({ to, label, icon: Icon }) => (
								<SidebarMenuItem key={to}>
									<SidebarMenuButton
										isActive={pathname === to}
										tooltip={label}
										render={<Link to={to} />}
									>
										<Icon />
										<span>{label}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
								<Avatar className="size-8 rounded-lg">
									<AvatarFallback className="rounded-lg">
										{user ? initials(user.name) : "?"}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left leading-tight">
									<span className="truncate font-medium">{user?.name}</span>
									<span className="truncate text-muted-foreground text-xs">
										{user?.email}
									</span>
								</div>
								<ChevronsUpDown className="ml-auto size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top" align="start" className="w-56">
								{/* Base UI requires GroupLabel to live inside a group. */}
								<DropdownMenuGroup>
									<DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
										{user?.email}
									</DropdownMenuLabel>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem render={<Link to="/settings" />}>
									<Settings className="size-4" />
									Settings
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() =>
										authClient.signOut({
											fetchOptions: {
												onSuccess: () => navigate({ to: "/login" }),
											},
										})
									}
								>
									<LogOut className="size-4" />
									Sign out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
