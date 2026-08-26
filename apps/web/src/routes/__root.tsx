import { Toaster } from "@boilerslate/ui/components/sonner";
import { THEME_INIT_SCRIPT } from "@boilerslate/ui/lib/themes";
import type { QueryClient } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { orpc } from "@/utils/orpc";
import { ThemeProvider } from "../components/theme-provider";
import appCss from "../index.css?url";
export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		// data-theme and the dark class are set by THEME_INIT_SCRIPT before
		// first paint, then owned by <ThemeProvider> once React hydrates.
		// suppressHydrationWarning: the script mutates these attributes, so the
		// server markup and the hydrated DOM legitimately differ here.
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			</head>
			<body>
				<ThemeProvider>
					<Outlet />
				</ThemeProvider>
				<Toaster richColors />
				{/* Both devtools sit bottom-right: bottom-left would cover the
					    sidebar's user menu and make it unclickable in development. */}
				<TanStackRouterDevtools position="bottom-right" />
				<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}
