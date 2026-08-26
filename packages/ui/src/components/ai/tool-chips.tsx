"use client";

/**
 * Tool calls rendered as compact, expandable chips.
 *
 * An agent run can involve dozens of calls; showing each one in full drowns
 * the answer. Each chip states what happened in one line and reveals its
 * payload on click.
 */
import { cn } from "@boilerslate/ui/lib/utils";
import {
	Check,
	ChevronDown,
	CircleAlert,
	FileCode,
	Image as ImageIcon,
	Loader2,
	Terminal,
	Wrench,
} from "lucide-react";
import { useState } from "react";

export type ToolKind = "edit" | "run" | "read" | "other";
export type ToolStatus = "running" | "done" | "error";

export interface ToolCall {
	id: string;
	kind: ToolKind;
	/** One-line summary, e.g. "Write 204 lines". */
	label: string;
	/** Target of the call, e.g. a filename or command. */
	target?: string;
	status?: ToolStatus;
	/** Monospace payload shown when expanded. */
	body?: string;
}

const ICONS: Record<ToolKind, typeof Wrench> = {
	edit: FileCode,
	run: Terminal,
	read: ImageIcon,
	other: Wrench,
};

function ToolChip({ call }: { call: ToolCall }) {
	const [open, setOpen] = useState(false);
	const Icon = ICONS[call.kind];
	const status = call.status ?? "done";

	return (
		<div data-slot="ai-tool-chip" className="rounded-lg border bg-card">
			<button
				type="button"
				aria-expanded={open}
				disabled={!call.body}
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors enabled:hover:bg-muted/50 disabled:cursor-default"
			>
				<Icon className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="font-medium">{call.label}</span>
				{call.target && (
					<code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
						{call.target}
					</code>
				)}
				<span className="ml-auto flex shrink-0 items-center gap-2">
					{status === "running" && (
						<Loader2 className="size-3.5 animate-spin text-muted-foreground" />
					)}
					{status === "done" && <Check className="size-3.5 text-primary" />}
					{status === "error" && (
						<CircleAlert className="size-3.5 text-destructive" />
					)}
					{call.body && (
						<ChevronDown
							className={cn(
								"size-4 text-muted-foreground transition-transform",
								open && "rotate-180",
							)}
						/>
					)}
				</span>
			</button>

			{open && call.body && (
				<pre className="overflow-x-auto border-t px-3 py-2 font-mono text-muted-foreground text-xs">
					{call.body}
				</pre>
			)}
		</div>
	);
}

export function ToolChips({
	calls,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & { calls: ToolCall[] }) {
	return (
		<div
			data-slot="ai-tool-chips"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		>
			{calls.map((call) => (
				<ToolChip key={call.id} call={call} />
			))}
		</div>
	);
}
