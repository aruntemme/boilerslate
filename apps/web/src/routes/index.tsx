import { Badge } from "@boilerslate/ui/components/badge";
import { Button } from "@boilerslate/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Squircle } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

/**
 * Public landing page. Deliberately plain — replace it with the real marketing
 * page. It exists to prove the API connection and to link into the app.
 */
function HomeComponent() {
	const healthCheck = useQuery(orpc.healthCheck.queryOptions());

	return (
		<div className="flex min-h-svh flex-col">
			<header className="flex h-16 items-center gap-2 border-b px-4 md:px-6">
				<div className="flex items-center gap-2 font-semibold">
					<span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<Squircle className="size-4" />
					</span>
					Boilerslate
				</div>
				<div className="ml-auto flex items-center gap-2">
					<ThemeSwitcher />
					<Button render={<Link to="/dashboard" />}>Open app</Button>
				</div>
			</header>

			<main className="flex flex-1 items-center justify-center px-4 py-16">
				<div className="flex max-w-xl flex-col items-center gap-6 text-center">
					<Badge variant="secondary">
						<span
							className={`mr-1.5 size-2 rounded-full ${
								healthCheck.data ? "bg-primary" : "bg-destructive"
							}`}
						/>
						{healthCheck.isLoading
							? "Checking API…"
							: healthCheck.data
								? "API connected"
								: "API unreachable"}
					</Badge>

					<h1 className="text-balance font-semibold text-4xl tracking-tight">
						A starting point, not a product
					</h1>
					<p className="text-balance text-muted-foreground">
						Multi-tenant auth, a themeable design system and a typed API,
						already wired together. Replace this page and build.
					</p>

					<div className="flex gap-3">
						<Button size="lg" render={<Link to="/dashboard" />}>
							Get started
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
