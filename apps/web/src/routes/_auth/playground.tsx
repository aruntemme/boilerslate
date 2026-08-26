/**
 * Component playground.
 *
 * Every component in @boilerslate/ui, rendered live and interactive. Its job
 * is to make design-system changes verifiable: switch theme, mode or radius
 * and you can see the effect on the whole library on one screen.
 *
 * When you add a component to packages/ui, add it here too.
 */

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@boilerslate/ui/components/accordion";
import { ApprovalCard } from "@boilerslate/ui/components/ai/approval-card";
import { Chat } from "@boilerslate/ui/components/ai/chat";
import { CodeBlock } from "@boilerslate/ui/components/ai/code-block";
import { ContextCards } from "@boilerslate/ui/components/ai/context-cards";
import { LoadingState } from "@boilerslate/ui/components/ai/loading-state";
import { PromptBar } from "@boilerslate/ui/components/ai/prompt-bar";
import {
	StreamingText,
	useStreamedText,
} from "@boilerslate/ui/components/ai/streaming-text";
import { TaskRows } from "@boilerslate/ui/components/ai/task-rows";
import { Thinking } from "@boilerslate/ui/components/ai/thinking";
import { ToolChips } from "@boilerslate/ui/components/ai/tool-chips";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@boilerslate/ui/components/alert";
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
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@boilerslate/ui/components/avatar";
import { Badge } from "@boilerslate/ui/components/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@boilerslate/ui/components/breadcrumb";
import { Button } from "@boilerslate/ui/components/button";
import {
	Card,
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
import { Checkbox } from "@boilerslate/ui/components/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@boilerslate/ui/components/collapsible";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { Empty } from "@boilerslate/ui/components/empty";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@boilerslate/ui/components/hover-card";
import { Input } from "@boilerslate/ui/components/input";
import { Label } from "@boilerslate/ui/components/label";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@boilerslate/ui/components/pagination";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
} from "@boilerslate/ui/components/popover";
import { Progress } from "@boilerslate/ui/components/progress";
import {
	RadioGroup,
	RadioGroupItem,
} from "@boilerslate/ui/components/radio-group";
import { ScrollArea } from "@boilerslate/ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@boilerslate/ui/components/select";
import { Separator } from "@boilerslate/ui/components/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@boilerslate/ui/components/sheet";
import { Skeleton } from "@boilerslate/ui/components/skeleton";
import { Slider } from "@boilerslate/ui/components/slider";
import {
	Stat,
	StatDelta,
	StatGroup,
	StatLabel,
	StatValue,
} from "@boilerslate/ui/components/stat";
import { Switch } from "@boilerslate/ui/components/switch";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@boilerslate/ui/components/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@boilerslate/ui/components/tabs";
import { Textarea } from "@boilerslate/ui/components/textarea";
import { Toggle } from "@boilerslate/ui/components/toggle";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@boilerslate/ui/components/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@boilerslate/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { Bold, Inbox, Italic, Terminal, Underline } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/playground")({
	component: RouteComponent,
});

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className="flex flex-wrap items-center gap-3">
				{children}
			</CardContent>
		</Card>
	);
}

const ROWS = [
	{ id: "1", name: "Ada Lovelace", role: "Owner", status: "Active" },
	{ id: "2", name: "Alan Turing", role: "Admin", status: "Active" },
	{ id: "3", name: "Grace Hopper", role: "Member", status: "Invited" },
];

const ANSWER =
	"Pistachio is your fastest-growing flavour — sales are up 23% this month, driven almost entirely by weekend traffic.";

const SOURCES = [
	{ id: "s1", title: "Scoop Data", host: "scoopdata.io" },
	{ id: "s2", title: "Trends Index", host: "trends.google.com" },
];

const THINKING_STEPS = [
	{ id: "t1", label: "Reading flavour briefs" },
	{ id: "t2", label: "Scanning supplier lists" },
	{ id: "t3", label: "Comparing tasting notes", detail: "6 flavours" },
	{ id: "t4", label: "Writing the report", status: "active" as const },
];

const TOOL_CALLS = [
	{
		id: "c1",
		kind: "edit" as const,
		label: "Write 204 lines",
		target: "ChurnSchedule.tsx",
		status: "done" as const,
		body: 'const windows = slots.filter((s) => s.temp <= -12)\nreturn schedule(windows, { hero: "pistachio" })',
	},
	{
		id: "c2",
		kind: "run" as const,
		label: "Rebuild and verify",
		target: "npm run freeze",
		status: "done" as const,
		body: "✓ built in 1.2s\n✓ 34 checks passed",
	},
	{
		id: "c3",
		kind: "read" as const,
		label: "Read image",
		target: "flavor-chart.png",
		status: "running" as const,
	},
];

const TASKS = [
	{
		id: "k1",
		title: "Verified vendor records",
		status: "completed" as const,
		meta: "12 suppliers",
		steps: [
			{ id: "k1a", label: "Matched tax and contact IDs", meta: "12/12" },
			{ id: "k1b", label: "Flagged stale records", meta: "0" },
		],
	},
	{
		id: "k2",
		title: "Build reorder task list",
		status: "running" as const,
		meta: "7 SKUs",
		steps: [
			{ id: "k2a", label: "Reading POS export", meta: "3 files" },
			{ id: "k2b", label: "Scoring stockout risk", meta: "68%" },
		],
	},
	{ id: "k3", title: "Draft supplier emails", status: "failed" as const },
	{ id: "k4", title: "Publish summer menu", status: "queued" as const },
];

const APPROVAL_QUESTIONS = [
	{
		id: "q1",
		question: "How many flavours should we launch?",
		options: [
			{ id: "a", label: "Three", description: "Core line" },
			{ id: "b", label: "Five", description: "Full case" },
			{ id: "c", label: "Just one hero" },
		],
	},
	{
		id: "q2",
		question: "Which market do we enter first?",
		options: [
			{ id: "a", label: "Food trucks" },
			{ id: "b", label: "Grocery freezers" },
			{ id: "c", label: "Scoop shops" },
		],
	},
];

const CHUNKS = [
	{
		id: "ch1",
		title: "Vendor onboarding rule",
		content:
			"Cold-chain certification must be verified before a new dairy can be added to the reorder workflow.",
		source: { name: "Dairy Onboarding SOP.pdf", kind: "pdf" },
		score: 0.92,
	},
	{
		id: "ch2",
		title: "Seasonal demand row",
		content:
			"Q4 velocity: pistachio +18%, vanilla +6%, rocky road −11%; retire flavours below 40 scoops weekly.",
		source: { name: "Sales Velocity Export.csv", kind: "csv" },
		score: 0.78,
	},
];

const DIFF = [
	{ type: "context" as const, content: "export async function churnBatch() {" },
	{
		type: "remove" as const,
		content: '  const flavor = await getFlavor("vanilla");',
	},
	{
		type: "add" as const,
		content: '  const flavor = await getFlavor("pistachio");',
	},
	{ type: "context" as const, content: "  return base.gallons;" },
	{ type: "context" as const, content: "}" },
];

const CHART_DATA = [
	{ month: "Jan", desktop: 186, mobile: 120 },
	{ month: "Feb", desktop: 305, mobile: 200 },
	{ month: "Mar", desktop: 237, mobile: 175 },
	{ month: "Apr", desktop: 173, mobile: 90 },
	{ month: "May", desktop: 209, mobile: 160 },
	{ month: "Jun", desktop: 214, mobile: 140 },
];

const CHART_CONFIG = {
	desktop: { label: "Desktop", color: "var(--chart-2)" },
	mobile: { label: "Mobile", color: "var(--chart-4)" },
} satisfies ChartConfig;

/** Charts and stat primitives. Colours come from the theme's chart ramp. */
function ChartsSection() {
	return (
		<>
			<Section
				title="Stats"
				description="Uppercase micro-label over a large value; grouped with dividers."
			>
				<StatGroup className="w-full">
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
				<div className="flex w-full gap-3">
					<StatDelta direction="up">+8.9% up</StatDelta>
					<StatDelta direction="down">−0.4% down</StatDelta>
					<StatDelta direction="flat">0.0% flat</StatDelta>
				</div>
			</Section>

			<Section
				title="Charts"
				description="Recharts via the shadcn chart wrapper. Hover for tooltips."
			>
				<div className="grid w-full min-w-0 gap-4 lg:grid-cols-2">
					<div className="min-w-0">
						<ChartContainer config={CHART_CONFIG} className="h-48 w-full">
							<BarChart data={CHART_DATA}>
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
					</div>
					<div className="min-w-0">
						<ChartContainer config={CHART_CONFIG} className="h-48 w-full">
							<AreaChart data={CHART_DATA}>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="month"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Area
									dataKey="desktop"
									type="natural"
									stroke="var(--color-desktop)"
									fill="var(--color-desktop)"
									fillOpacity={0.2}
								/>
							</AreaChart>
						</ChartContainer>
					</div>
				</div>
			</Section>
		</>
	);
}

/** Every AI primitive, wired to real state. */
function AiSection() {
	const stream = useStreamedText(ANSWER);
	const [messages, setMessages] = useState([
		{
			id: "m1",
			role: "user" as const,
			content: "Compare mint chip to last summer",
		},
		{
			id: "m2",
			role: "assistant" as const,
			content:
				"Mint chip is up 12%, with stronger weekend peaks than last year.",
		},
	]);
	const [sent, setSent] = useState<string | null>(null);
	const [approved, setApproved] = useState<string | null>(null);

	return (
		<>
			<Section title="AI · Loading & Thinking">
				<LoadingState label="Churning" variant="grid" />
				<LoadingState label="Reading" variant="dots" />
				<LoadingState label="Indexing" variant="orbit" />
				<Thinking
					className="w-full"
					steps={THINKING_STEPS}
					durationSeconds={4}
					defaultOpen
				/>
			</Section>

			<Section
				title="AI · Streaming answer"
				description="Re-renders as tokens arrive, with sources and follow-ups."
			>
				<StreamingText
					className="w-full"
					text={stream.text}
					streaming={!stream.done}
					sources={SOURCES}
					followUps={[
						"Which flavours sell best in winter",
						"Compare gelato and soft serve margins",
					]}
					onFollowUp={(p) => toast(`Follow-up: ${p}`)}
				/>
			</Section>

			<Section
				title="AI · Tool calls"
				description="Click a chip to expand its payload."
			>
				<ToolChips className="w-full" calls={TOOL_CALLS} />
			</Section>

			<Section title="AI · Task status">
				<TaskRows className="w-full" tasks={TASKS} />
			</Section>

			<Section
				title="AI · Approval"
				description="Human-in-the-loop before the agent acts."
			>
				<ApprovalCard
					className="w-full"
					questions={APPROVAL_QUESTIONS}
					onComplete={(answers) => {
						setApproved(JSON.stringify(answers));
						toast.success("Approved");
					}}
				/>
				{approved && (
					<p className="w-full text-muted-foreground text-xs">
						Answers: <code>{approved}</code>
					</p>
				)}
			</Section>

			<Section title="AI · Retrieved context">
				<ContextCards className="w-full" chunks={CHUNKS} totalChunks={32} />
			</Section>

			<Section title="AI · Code">
				<CodeBlock
					className="w-full"
					filename="churn.ts"
					code={
						'export async function churnBatch() {\n  const flavor = await getFlavor("pistachio");\n  await freezer.store(flavor, { temp: "-16C" });\n  return flavor.gallons;\n}'
					}
				/>
				<CodeBlock
					className="w-full"
					filename="churn.ts — proposed"
					diff={DIFF}
				/>
			</Section>

			<Section
				title="AI · Chat & Prompt bar"
				description="Type @ for sources or / for commands. Enter sends."
			>
				<Chat
					className="max-h-64 w-full"
					messages={messages}
					userInitials="AT"
				/>
				<PromptBar
					className="w-full"
					sources={[
						{ id: "s1", label: "sales.csv", hint: "file" },
						{ id: "s2", label: "suppliers", hint: "table" },
					]}
					commands={[
						{ id: "c1", label: "summarise" },
						{ id: "c2", label: "compare" },
					]}
					models={["opus-5", "sonnet-5", "haiku-4.5"]}
					model="opus-5"
					onSubmit={(v) => {
						setSent(v);
						setMessages((m) => [
							...m,
							{ id: `m${m.length + 1}`, role: "user" as const, content: v },
						]);
						toast.success("Sent to the agent");
					}}
				/>
				{sent && (
					<p className="w-full text-muted-foreground text-xs">
						Last submitted: <code>{sent}</code>
					</p>
				)}
			</Section>
		</>
	);
}

function RouteComponent() {
	const [checked, setChecked] = useState(true);
	const [switched, setSwitched] = useState(true);
	const [radio, setRadio] = useState("comfortable");
	const [slider, setSlider] = useState(40);
	const [select, setSelect] = useState("emerald");
	const [toggles, setToggles] = useState<string[]>(["bold"]);
	const [bold, setBold] = useState(false);
	const [page, setPage] = useState(2);
	const [progress, setProgress] = useState(60);

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Playground</h1>
				<p className="text-muted-foreground text-sm">
					Every component, live. Change the theme or radius in Settings and
					watch the whole system follow.
				</p>
			</div>

			<Section title="Buttons" description="All variants and sizes.">
				<Button>Default</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="link">Link</Button>
				<Separator orientation="vertical" className="h-6" />
				<Button size="sm">Small</Button>
				<Button size="lg">Large</Button>
				<Button size="icon" aria-label="Bold">
					<Bold />
				</Button>
				<Button disabled>Disabled</Button>
			</Section>

			<Section title="Badges">
				<Badge>Default</Badge>
				<Badge variant="secondary">Secondary</Badge>
				<Badge variant="outline">Outline</Badge>
				<Badge variant="destructive">Destructive</Badge>
			</Section>

			<Section title="Avatar & Skeleton">
				<Avatar>
					<AvatarImage src="" alt="" />
					<AvatarFallback>AT</AvatarFallback>
				</Avatar>
				<Avatar className="size-12">
					<AvatarFallback>GH</AvatarFallback>
				</Avatar>
				<Separator orientation="vertical" className="h-8" />
				<Skeleton className="h-9 w-9 rounded-full" />
				<Skeleton className="h-4 w-40" />
			</Section>

			<Section title="Text inputs">
				<div className="grid w-full max-w-sm gap-1.5">
					<Label htmlFor="pg-email">Email</Label>
					<Input id="pg-email" type="email" placeholder="you@example.com" />
				</div>
				<div className="grid w-full max-w-sm gap-1.5">
					<Label htmlFor="pg-note">Note</Label>
					<Textarea id="pg-note" placeholder="Say something…" />
				</div>
				<div className="grid w-full max-w-sm gap-1.5">
					<Label htmlFor="pg-disabled">Disabled</Label>
					<Input id="pg-disabled" disabled placeholder="Not editable" />
				</div>
			</Section>

			<Section
				title="Selection controls"
				description="All wired to real state."
			>
				<div className="flex items-center gap-2">
					<Checkbox
						id="pg-check"
						checked={checked}
						onCheckedChange={(v) => setChecked(v === true)}
					/>
					<Label htmlFor="pg-check">Checkbox ({String(checked)})</Label>
				</div>

				<Separator orientation="vertical" className="h-6" />

				<div className="flex items-center gap-2">
					<Switch
						id="pg-switch"
						checked={switched}
						onCheckedChange={setSwitched}
					/>
					<Label htmlFor="pg-switch">Switch ({String(switched)})</Label>
				</div>

				<Separator orientation="vertical" className="h-6" />

				<RadioGroup
					value={radio}
					onValueChange={(v) => setRadio(String(v))}
					className="flex gap-4"
				>
					{["comfortable", "compact"].map((v) => (
						<div key={v} className="flex items-center gap-2">
							<RadioGroupItem value={v} id={`pg-radio-${v}`} />
							<Label htmlFor={`pg-radio-${v}`}>{v}</Label>
						</div>
					))}
				</RadioGroup>

				<Separator orientation="vertical" className="h-6" />

				<Toggle pressed={bold} onPressedChange={setBold} aria-label="Bold">
					<Bold />
				</Toggle>

				<ToggleGroup
					value={toggles}
					onValueChange={(v) => setToggles(v as string[])}
				>
					<ToggleGroupItem value="bold" aria-label="Bold">
						<Bold />
					</ToggleGroupItem>
					<ToggleGroupItem value="italic" aria-label="Italic">
						<Italic />
					</ToggleGroupItem>
					<ToggleGroupItem value="underline" aria-label="Underline">
						<Underline />
					</ToggleGroupItem>
				</ToggleGroup>
			</Section>

			<Section title="Slider & Progress">
				<div className="grid w-full max-w-sm gap-2">
					<Label>Slider — {slider}</Label>
					<Slider
						value={slider}
						onValueChange={(v) => setSlider(typeof v === "number" ? v : v[0])}
					/>
				</div>
				<div className="grid w-full max-w-sm gap-2">
					<Label>Progress — {progress}%</Label>
					<Progress value={progress} />
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setProgress((p) => Math.max(0, p - 20))}
						>
							−20
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setProgress((p) => Math.min(100, p + 20))}
						>
							+20
						</Button>
					</div>
				</div>
			</Section>

			<Section title="Select & Dropdown">
				<Select value={select} onValueChange={(v) => setSelect(String(v))}>
					<SelectTrigger className="w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Themes</SelectLabel>
							<SelectItem value="emerald">Emerald</SelectItem>
							<SelectItem value="violet">Violet</SelectItem>
							<SelectItem value="blue">Blue</SelectItem>
							<SelectItem value="rose">Rose</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>

				<DropdownMenu>
					<DropdownMenuTrigger render={<Button variant="outline" />}>
						Open menu
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuGroup>
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => toast("Edit clicked")}>
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => toast("Duplicate clicked")}>
							Duplicate
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => toast.error("Deleted")}
						>
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<span className="text-muted-foreground text-sm">
					selected: {select}
				</span>
			</Section>

			<Section
				title="Overlays"
				description="Dialog, confirm, sheet, popover, hover card, tooltip."
			>
				<Dialog>
					<DialogTrigger render={<Button variant="outline" />}>
						Dialog
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit profile</DialogTitle>
							<DialogDescription>
								Make changes and save when you are done.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-1.5">
							<Label htmlFor="pg-dialog-name">Name</Label>
							<Input id="pg-dialog-name" defaultValue="Ada Lovelace" />
						</div>
						<DialogFooter>
							<DialogClose render={<Button variant="outline" />}>
								Cancel
							</DialogClose>
							<DialogClose render={<Button />}>Save</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<AlertDialog>
					<AlertDialogTrigger render={<Button variant="destructive" />}>
						Confirm
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this project?</AlertDialogTitle>
							<AlertDialogDescription>
								This cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={() => toast.error("Project deleted")}>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<Sheet>
					<SheetTrigger render={<Button variant="outline" />}>
						Sheet
					</SheetTrigger>
					<SheetContent>
						<SheetHeader>
							<SheetTitle>Panel</SheetTitle>
							<SheetDescription>Slides in from the edge.</SheetDescription>
						</SheetHeader>
					</SheetContent>
				</Sheet>

				<Popover>
					<PopoverTrigger render={<Button variant="outline" />}>
						Popover
					</PopoverTrigger>
					<PopoverContent className="w-72">
						<PopoverTitle>Dimensions</PopoverTitle>
						<PopoverDescription>Set the layout dimensions.</PopoverDescription>
					</PopoverContent>
				</Popover>

				<HoverCard>
					<HoverCardTrigger render={<Button variant="link" />}>
						Hover me
					</HoverCardTrigger>
					<HoverCardContent className="w-64">
						<p className="text-sm">Shown on hover, after a short delay.</p>
					</HoverCardContent>
				</HoverCard>

				<Tooltip>
					<TooltipTrigger render={<Button variant="outline" />}>
						Tooltip
					</TooltipTrigger>
					<TooltipContent>Short hint</TooltipContent>
				</Tooltip>
			</Section>

			<Section title="Feedback">
				<Alert className="w-full">
					<Terminal />
					<AlertTitle>Heads up</AlertTitle>
					<AlertDescription>
						This is an informational alert with an action.
					</AlertDescription>
					<AlertAction>
						<Button size="sm" variant="outline">
							Undo
						</Button>
					</AlertAction>
				</Alert>

				<Alert variant="destructive" className="w-full">
					<Terminal />
					<AlertTitle>Something failed</AlertTitle>
					<AlertDescription>
						The request could not be completed.
					</AlertDescription>
				</Alert>

				<Button
					variant="outline"
					onClick={() => toast.success("Saved successfully")}
				>
					Success toast
				</Button>
				<Button
					variant="outline"
					onClick={() => toast.error("Something broke")}
				>
					Error toast
				</Button>
				<Button
					variant="outline"
					onClick={() =>
						toast.promise(new Promise((r) => setTimeout(r, 1200)), {
							loading: "Saving…",
							success: "Saved",
							error: "Failed",
						})
					}
				>
					Promise toast
				</Button>

				<Empty className="w-full">
					<Inbox className="size-6 text-muted-foreground" />
					<p className="font-medium">Nothing here yet</p>
					<p className="text-muted-foreground text-sm">
						Empty states use this component.
					</p>
				</Empty>
			</Section>

			<Section title="Disclosure" description="Tabs, accordion, collapsible.">
				<Tabs defaultValue="account" className="w-full">
					<TabsList>
						<TabsTrigger value="account">Account</TabsTrigger>
						<TabsTrigger value="password">Password</TabsTrigger>
						<TabsTrigger value="team">Team</TabsTrigger>
					</TabsList>
					<TabsContent
						value="account"
						className="pt-3 text-muted-foreground text-sm"
					>
						Account settings live here.
					</TabsContent>
					<TabsContent
						value="password"
						className="pt-3 text-muted-foreground text-sm"
					>
						Change your password here.
					</TabsContent>
					<TabsContent
						value="team"
						className="pt-3 text-muted-foreground text-sm"
					>
						Invite and manage teammates.
					</TabsContent>
				</Tabs>

				<Accordion className="w-full">
					<AccordionItem value="a">
						<AccordionTrigger>What is this repo?</AccordionTrigger>
						<AccordionContent>
							A starting point for multi-tenant SaaS apps.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="b">
						<AccordionTrigger>Can I change the theme?</AccordionTrigger>
						<AccordionContent>
							Yes — eight themes, light and dark, from Settings.
						</AccordionContent>
					</AccordionItem>
				</Accordion>

				<Collapsible className="w-full">
					<CollapsibleTrigger render={<Button variant="outline" />}>
						Toggle details
					</CollapsibleTrigger>
					<CollapsibleContent className="pt-3 text-muted-foreground text-sm">
						Hidden content revealed by the trigger above.
					</CollapsibleContent>
				</Collapsible>
			</Section>

			<Section title="Data display">
				<Table>
					<TableCaption>Members of the current organization.</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Role</TableHead>
							<TableHead className="text-right">Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{ROWS.map((row) => (
							<TableRow key={row.id}>
								<TableCell className="font-medium">{row.name}</TableCell>
								<TableCell>{row.role}</TableCell>
								<TableCell className="text-right">
									<Badge
										variant={row.status === "Active" ? "secondary" : "outline"}
									>
										{row.status}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>

				<ScrollArea className="h-32 w-full rounded-lg border p-3">
					<div className="flex flex-col gap-2 text-sm">
						{Array.from({ length: 20 }, (_, i) => (
							<span key={`scroll-row-${i + 1}`}>Scrollable row {i + 1}</span>
						))}
					</div>
				</ScrollArea>
			</Section>

			<Section title="Navigation">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Playground</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href="#"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							/>
						</PaginationItem>
						{[1, 2, 3].map((n) => (
							<PaginationItem key={n}>
								<PaginationLink
									href="#"
									isActive={page === n}
									onClick={() => setPage(n)}
								>
									{n}
								</PaginationLink>
							</PaginationItem>
						))}
						<PaginationItem>
							<PaginationNext
								href="#"
								onClick={() => setPage((p) => Math.min(3, p + 1))}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</Section>

			<ChartsSection />

			<AiSection />

			<Card>
				<CardHeader>
					<CardTitle>Card</CardTitle>
					<CardDescription>With a header, content and footer.</CardDescription>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					Cards wrap every section on this page.
				</CardContent>
				<CardFooter className="gap-2">
					<Button size="sm">Save</Button>
					<Button size="sm" variant="outline">
						Cancel
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
