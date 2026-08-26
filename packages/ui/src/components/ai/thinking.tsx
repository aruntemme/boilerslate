"use client";

/**
 * Collapsible reasoning trace.
 *
 * Summarised by default ("Thought for 4 seconds") because the trace is
 * reassurance, not the answer — expand it only when someone wants to audit
 * what the model did.
 */
import { cn } from "@boilerslate/ui/lib/utils";
import { Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

export interface ThinkingStep {
	id: string;
	label: string;
	/** Small trailing note, e.g. a count or a filename. */
	detail?: string;
	status?: "done" | "active" | "pending";
}

export function Thinking({
	steps,
	durationSeconds,
	defaultOpen = false,
	streaming = false,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	steps: ThinkingStep[];
	/** Omit while still thinking; the header shows a live state instead. */
	durationSeconds?: number;
	defaultOpen?: boolean;
	streaming?: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div
			data-slot="ai-thinking"
			className={cn("rounded-lg border bg-card", className)}
			{...props}
		>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
			>
				{streaming ? (
					<Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
				) : (
					<Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
				)}
				<span className="font-medium">
					{streaming
						? "Thinking…"
						: durationSeconds != null
							? `Thought for ${durationSeconds} seconds`
							: "Reasoning"}
				</span>
				<ChevronDown
					className={cn(
						"ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
						open && "rotate-180",
					)}
				/>
			</button>

			{open && (
				<ol className="flex flex-col gap-2 border-t px-3 py-3">
					{steps.map((step) => (
						<li key={step.id} className="flex items-center gap-2 text-sm">
							{step.status === "active" ? (
								<Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
							) : step.status === "pending" ? (
								<span className="size-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
							) : (
								<Check className="size-3.5 shrink-0 text-primary" />
							)}
							<span
								className={cn(
									step.status === "pending" && "text-muted-foreground",
								)}
							>
								{step.label}
							</span>
							{step.detail && (
								<span className="text-muted-foreground text-xs">
									{step.detail}
								</span>
							)}
						</li>
					))}
				</ol>
			)}
		</div>
	);
}
