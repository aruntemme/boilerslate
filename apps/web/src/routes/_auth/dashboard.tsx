/**
 * Dashboard.
 *
 * Doubles as the reference for how a data-dense page should look in this
 * system: full-bleed grid, cards that own their padding, uppercase micro-labels
 * over large values, and charts that read their colours from the theme tokens
 * rather than hard-coded hex.
 */
import { Badge } from "@boilerslate/ui/components/badge";
import { Button } from "@boilerslate/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@boilerslate/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@boilerslate/ui/components/chart";
import { Progress } from "@boilerslate/ui/components/progress";
import { Separator } from "@boilerslate/ui/components/separator";
import {
	Stat,
	StatDelta,
	StatGroup,
	StatLabel,
	StatValue,
} from "@boilerslate/ui/components/stat";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
} from "recharts";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

/* ------------------------------------------------------------------ data */

const TRAFFIC = [
	{ month: "Jan", desktop: 186, mobile: 120 },
	{ month: "Feb", desktop: 305, mobile: 200 },
	{ month: "Mar", desktop: 237, mobile: 175 },
	{ month: "Apr", desktop: 173, mobile: 90 },
	{ month: "May", desktop: 209, mobile: 160 },
	{ month: "Jun", desktop: 214, mobile: 140 },
];

const VISITORS = [
	{ month: "Jan", visitors: 1200 },
	{ month: "Feb", visitors: 2100 },
	{ month: "Mar", visitors: 1800 },
	{ month: "Apr", visitors: 2600 },
	{ month: "May", visitors: 2200 },
	{ month: "Jun", visitors: 3100 },
];

const REVENUE = [
	{ month: "Jan", mrr: 12400 },
	{ month: "Feb", mrr: 13800 },
	{ month: "Mar", mrr: 13100 },
	{ month: "Apr", mrr: 15200 },
	{ month: "May", mrr: 16900 },
	{ month: "Jun", mrr: 18400 },
];

const BROWSERS = [
	{ browser: "Chrome", share: 412, fill: "var(--color-chart-1)" },
	{ browser: "Safari", share: 289, fill: "var(--color-chart-2)" },
	{ browser: "Firefox", share: 143, fill: "var(--color-chart-3)" },
	{ browser: "Edge", share: 91, fill: "var(--color-chart-4)" },
];

const USAGE = [
	{ label: "Edge requests", value: "$1,830.00", meter: 78 },
	{ label: "Fast data transfer", value: "$952.51", meter: 54 },
	{ label: "Monitoring data points", value: "$901.20", meter: 47 },
	{ label: "Web analytics events", value: "$603.71", meter: 31 },
	{ label: "Function duration", value: "$412.09", meter: 18 },
];

const trafficConfig = {
	desktop: { label: "Desktop", color: "var(--chart-2)" },
	mobile: { label: "Mobile", color: "var(--chart-4)" },
} satisfies ChartConfig;

const visitorsConfig = {
	visitors: { label: "Visitors", color: "var(--chart-2)" },
} satisfies ChartConfig;

const revenueConfig = {
	mrr: { label: "MRR", color: "var(--chart-2)" },
} satisfies ChartConfig;

const browserConfig = {
	share: { label: "Share" },
	Chrome: { label: "Chrome", color: "var(--chart-1)" },
	Safari: { label: "Safari", color: "var(--chart-2)" },
	Firefox: { label: "Firefox", color: "var(--chart-3)" },
	Edge: { label: "Edge", color: "var(--chart-4)" },
} satisfies ChartConfig;

const TOTAL_BROWSERS = BROWSERS.reduce((sum, b) => sum + b.share, 0);

/* ------------------------------------------------------------- fragments */

function KpiCard({
	label,
	value,
	delta,
	direction,
	data,
}: {
	label: string;
	value: string;
	delta: string;
	direction: "up" | "down";
	data: { month: string; visitors: number }[];
}) {
	return (
		<Card className="min-w-0">
			<CardHeader>
				<StatLabel>{label}</StatLabel>
				<CardAction>
					<StatDelta
						direction={direction}
						className="flex items-center gap-0.5"
					>
						{direction === "up" ? (
							<ArrowUpRight className="size-3" />
						) : (
							<ArrowDownRight className="size-3" />
						)}
						{delta}
					</StatDelta>
				</CardAction>
			</CardHeader>
			<CardContent className="flex items-end justify-between gap-4">
				<StatValue size="lg">{value}</StatValue>
				<ChartContainer config={visitorsConfig} className="h-10 w-24 shrink-0">
					<LineChart data={data}>
						<Line
							dataKey="visitors"
							stroke="var(--color-visitors)"
							strokeWidth={1.5}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

/* ----------------------------------------------------------------- page */

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const privateData = useQuery(orpc.privateData.queryOptions());
	const user = session.data?.user;

	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						Welcome back, {user?.name}. Here is the last six months.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">
						{privateData.data ? "API connected" : "API unreachable"}
					</Badge>
					<Button size="sm">View report</Button>
				</div>
			</div>

			<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					label="Monthly revenue"
					value="$18,400"
					delta="+8.9%"
					direction="up"
					data={REVENUE.map((r) => ({ month: r.month, visitors: r.mrr }))}
				/>
				<KpiCard
					label="Active users"
					value="3,104"
					delta="+2.1%"
					direction="up"
					data={VISITORS}
				/>
				<KpiCard
					label="Churn"
					value="1.8%"
					delta="−0.4%"
					direction="down"
					data={VISITORS.map((v) => ({ ...v, visitors: 4000 - v.visitors }))}
				/>
				<KpiCard
					label="Open tickets"
					value="27"
					delta="+5"
					direction="up"
					data={TRAFFIC.map((t) => ({ month: t.month, visitors: t.desktop }))}
				/>
			</div>

			<div className="grid gap-5 lg:grid-cols-3">
				<Card className="min-w-0 lg:col-span-2">
					<CardHeader>
						<CardTitle>Traffic channels</CardTitle>
						<CardDescription>
							Monthly desktop and mobile traffic for the last six months —
							compare volume and mix across platforms.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={trafficConfig} className="h-56 w-full">
							<BarChart data={TRAFFIC}>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="month"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="desktop"
									fill="var(--color-desktop)"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="mobile"
									fill="var(--color-mobile)"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className="flex-col items-stretch gap-4 border-t bg-transparent">
						<StatGroup>
							<Stat>
								<StatLabel>Desktop</StatLabel>
								<StatValue>1,224</StatValue>
							</Stat>
							<Stat>
								<StatLabel>Mobile</StatLabel>
								<StatValue>860</StatValue>
							</Stat>
							<Stat>
								<StatLabel>Mix delta</StatLabel>
								<StatValue>
									+42<span className="text-muted-foreground">%</span>
								</StatValue>
							</Stat>
						</StatGroup>
					</CardFooter>
				</Card>

				<Card className="min-w-0">
					<CardHeader>
						<CardTitle>Browser share</CardTitle>
						<CardDescription>January – June 2026</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<ChartContainer
							config={browserConfig}
							className="mx-auto aspect-square h-44"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={BROWSERS}
									dataKey="share"
									nameKey="browser"
									innerRadius={52}
									strokeWidth={2}
								>
									{BROWSERS.map((entry) => (
										<Cell key={entry.browser} fill={entry.fill} />
									))}
								</Pie>
							</PieChart>
						</ChartContainer>

						<div className="pointer-events-none -mt-28 flex flex-col items-center pb-16">
							<StatValue size="lg">{TOTAL_BROWSERS.toLocaleString()}</StatValue>
							<StatLabel>Visitors</StatLabel>
						</div>

						<div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
							{BROWSERS.map((b) => (
								<span
									key={b.browser}
									className="flex items-center gap-1.5 text-xs"
								>
									<span
										aria-hidden="true"
										className="size-2 rounded-[2px]"
										style={{ background: b.fill }}
									/>
									{b.browser}
								</span>
							))}
						</div>

						<Separator />

						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between text-sm">
								<span>Chrome</span>
								<span className="text-muted-foreground tabular-nums">
									{Math.round((BROWSERS[0].share / TOTAL_BROWSERS) * 100)}%
								</span>
							</div>
							<Progress
								value={Math.round((BROWSERS[0].share / TOTAL_BROWSERS) * 100)}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-5 lg:grid-cols-3">
				<Card className="min-w-0 lg:col-span-2">
					<CardHeader>
						<CardTitle>Recurring revenue</CardTitle>
						<CardDescription>MRR across the last six months</CardDescription>
						<CardAction>
							<StatDelta direction="up">+2% vs last month</StatDelta>
						</CardAction>
					</CardHeader>
					<CardContent>
						<ChartContainer config={revenueConfig} className="h-52 w-full">
							<AreaChart data={REVENUE}>
								<defs>
									<linearGradient id="fill-mrr" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="var(--color-mrr)"
											stopOpacity={0.35}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-mrr)"
											stopOpacity={0}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="month"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Area
									dataKey="mrr"
									type="natural"
									stroke="var(--color-mrr)"
									strokeWidth={2}
									fill="url(#fill-mrr)"
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card className="min-w-0">
					<CardHeader>
						<CardTitle>Usage this cycle</CardTitle>
						<CardDescription>5 days remaining</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3.5">
						{USAGE.map((row) => (
							<div key={row.label} className="flex flex-col gap-1.5">
								<div className="flex items-baseline justify-between gap-3 text-sm">
									<span className="truncate">{row.label}</span>
									<span className="shrink-0 font-medium tabular-nums">
										{row.value}
									</span>
								</div>
								<Progress value={row.meter} />
							</div>
						))}
					</CardContent>
					<CardFooter className="border-t bg-transparent">
						<Button variant="outline" size="sm" className="w-full">
							View invoice
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
