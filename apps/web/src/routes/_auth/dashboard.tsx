import { Badge } from "@boilerslate/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@boilerslate/ui/components/card";
import { Skeleton } from "@boilerslate/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const privateData = useQuery(orpc.privateData.queryOptions());
	const health = useQuery(orpc.healthCheck.queryOptions());

	const user = session.data?.user;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					Welcome back, {user?.name}.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardDescription className="flex items-center gap-2">
							<Activity className="size-4" />
							API
						</CardDescription>
						<CardTitle className="text-xl">
							{health.isPending ? (
								<Skeleton className="h-6 w-24" />
							) : health.data ? (
								<Badge>Connected</Badge>
							) : (
								<Badge variant="destructive">Unreachable</Badge>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-muted-foreground text-sm">
						Typed oRPC call to the Hono server.
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription className="flex items-center gap-2">
							<ShieldCheck className="size-4" />
							Protected route
						</CardDescription>
						<CardTitle className="text-xl">
							{privateData.isPending ? (
								<Skeleton className="h-6 w-32" />
							) : (
								(privateData.data?.message ?? "—")
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-muted-foreground text-sm">
						Resolved with your session; anonymous callers get a 401.
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription className="flex items-center gap-2">
							<Users className="size-4" />
							Signed in as
						</CardDescription>
						<CardTitle className="truncate text-xl">{user?.email}</CardTitle>
					</CardHeader>
					<CardContent className="text-muted-foreground text-sm">
						Better Auth session, backed by Postgres.
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Start here</CardTitle>
					<CardDescription>
						This page is a placeholder — replace it with the product.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					Add routes under{" "}
					<code className="text-foreground">src/routes/_auth/</code> and they
					inherit this shell. Register them in{" "}
					<code className="text-foreground">components/app-sidebar.tsx</code> to
					appear in the navigation.
				</CardContent>
			</Card>
		</div>
	);
}
