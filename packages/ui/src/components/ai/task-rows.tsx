"use client";

/**
 * Live status for the tasks an agent is working through.
 *
 * Each task can carry sub-steps, so a long run stays scannable: the row says
 * what is happening, the sub-steps say how far along it is.
 */
import { cn } from "@boilerslate/ui/lib/utils";
import { Check, ChevronDown, CircleAlert, Loader2 } from "lucide-react";
import { useState } from "react";

export type TaskStatus = "running" | "completed" | "failed" | "queued";

export interface AgentTask {
	id: string;
	title: string;
	status: TaskStatus;
	/** Short trailing note, e.g. "12 suppliers". */
	meta?: string;
	steps?: { id: string; label: string; meta?: string }[];
}

const STATUS_LABEL: Record<TaskStatus, string> = {
	running: "Running",
	completed: "Completed",
	failed: "Failed",
	queued: "Queued",
};

function StatusIcon({ status }: { status: TaskStatus }) {
	if (status === "running")
		return (
			<Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
		);
	if (status === "failed")
		return <CircleAlert className="size-4 shrink-0 text-destructive" />;
	if (status === "queued")
		return (
			<span className="size-4 shrink-0 rounded-full border border-muted-foreground/40" />
		);
	return <Check className="size-4 shrink-0 text-primary" />;
}

function TaskRow({ task }: { task: AgentTask }) {
	const [open, setOpen] = useState(task.status === "running");
	const hasSteps = (task.steps?.length ?? 0) > 0;

	return (
		<div data-slot="ai-task-row" className="rounded-lg border bg-card">
			<button
				type="button"
				aria-expanded={hasSteps ? open : undefined}
				disabled={!hasSteps}
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors enabled:hover:bg-muted/50 disabled:cursor-default"
			>
				<StatusIcon status={task.status} />
				<span className="font-medium">{task.title}</span>
				{task.meta && (
					<span className="text-muted-foreground text-xs">{task.meta}</span>
				)}
				<span className="ml-auto flex shrink-0 items-center gap-2">
					<span
						className={cn(
							"text-xs",
							task.status === "failed"
								? "text-destructive"
								: "text-muted-foreground",
						)}
					>
						{STATUS_LABEL[task.status]}
					</span>
					{hasSteps && (
						<ChevronDown
							className={cn(
								"size-4 text-muted-foreground transition-transform",
								open && "rotate-180",
							)}
						/>
					)}
				</span>
			</button>

			{open && hasSteps && (
				<ul className="flex flex-col gap-1.5 border-t px-3 py-2.5 pl-9">
					{task.steps?.map((step) => (
						<li
							key={step.id}
							className="flex items-center gap-2 text-muted-foreground text-sm"
						>
							<span className="size-1 rounded-full bg-muted-foreground/50" />
							{step.label}
							{step.meta && <span className="text-xs">{step.meta}</span>}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function TaskRows({
	tasks,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & { tasks: AgentTask[] }) {
	return (
		<div
			data-slot="ai-task-rows"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		>
			{tasks.map((task) => (
				<TaskRow key={task.id} task={task} />
			))}
		</div>
	);
}
