import { Button } from "@boilerslate/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@boilerslate/ui/components/card";
import { Label } from "@boilerslate/ui/components/label";
import { Separator } from "@boilerslate/ui/components/separator";
import { type Mode, RADII, THEMES } from "@boilerslate/ui/lib/themes";
import { cn } from "@boilerslate/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/_auth/settings")({
	component: RouteComponent,
});

const MODES: { value: Mode; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const { theme, mode, radius, setTheme, setMode, setRadius, reset } =
		useTheme();

	const user = session.data?.user;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
				<p className="text-muted-foreground text-sm">
					Preferences are stored in this browser.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Account</CardTitle>
					<CardDescription>Your Better Auth profile.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-1.5">
						<Label className="text-muted-foreground text-xs">Name</Label>
						<p className="text-sm">{user?.name}</p>
					</div>
					<div className="grid gap-1.5">
						<Label className="text-muted-foreground text-xs">Email</Label>
						<p className="truncate text-sm">{user?.email}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<CardDescription>
						Pick a theme and a light or dark mode. Changes apply immediately.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<div className="grid gap-3">
						<Label>Theme</Label>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{THEMES.map((t) => {
								const selected = t.id === theme;
								return (
									<button
										key={t.id}
										type="button"
										aria-pressed={selected}
										onClick={() => setTheme(t.id)}
										className={cn(
											"flex items-center gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-accent",
											selected
												? "border-primary ring-1 ring-primary"
												: "border-border",
										)}
									>
										<span
											aria-hidden="true"
											className="size-4 shrink-0 rounded-full border border-border"
											style={{ background: t.swatch }}
										/>
										<span className="truncate">{t.label}</span>
										{selected && <Check className="ml-auto size-4 shrink-0" />}
									</button>
								);
							})}
						</div>
					</div>

					<Separator />

					<div className="grid gap-3">
						<Label>Mode</Label>
						<div className="flex flex-wrap gap-2">
							{MODES.map(({ value, label, icon: Icon }) => (
								<Button
									key={value}
									type="button"
									variant={mode === value ? "default" : "outline"}
									onClick={() => setMode(value)}
								>
									<Icon className="size-4" />
									{label}
								</Button>
							))}
						</div>
					</div>

					<Separator />

					<div className="grid gap-3">
						<Label>Corner radius</Label>
						<div className="flex flex-wrap gap-2">
							{RADII.map(({ label, value }) => (
								<Button
									key={value}
									type="button"
									variant={radius === value ? "default" : "outline"}
									onClick={() => setRadius(value)}
								>
									{label}
								</Button>
							))}
						</div>
					</div>

					<Separator />

					<div className="grid gap-3">
						<Label>Preview</Label>
						<div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-4">
							<Button>Primary</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="outline">Outline</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="destructive">Destructive</Button>
						</div>
					</div>

					<div>
						<Button variant="ghost" onClick={reset}>
							<RotateCcw className="size-4" />
							Reset to defaults
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
