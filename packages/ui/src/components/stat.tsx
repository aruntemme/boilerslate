/**
 * Stat primitives.
 *
 * The pattern dashboards keep needing: a small uppercase label above a large
 * value, optionally with a delta, and several of them in a divided row.
 * Built here rather than repeated as ad-hoc Tailwind on every dashboard.
 */
import { cn } from "@boilerslate/ui/lib/utils";

/** Small uppercase caption. Use above a value, not as a heading. */
export function StatLabel({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="stat-label"
			className={cn(
				"font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider",
				className,
			)}
			{...props}
		/>
	);
}

export function StatValue({
	className,
	size = "default",
	...props
}: React.ComponentProps<"div"> & { size?: "default" | "lg" }) {
	return (
		<div
			data-slot="stat-value"
			className={cn(
				"font-semibold tabular-nums tracking-tight",
				size === "lg" ? "text-3xl" : "text-xl",
				className,
			)}
			{...props}
		/>
	);
}

export function StatDelta({
	className,
	direction = "up",
	...props
}: React.ComponentProps<"span"> & { direction?: "up" | "down" | "flat" }) {
	return (
		<span
			data-slot="stat-delta"
			className={cn(
				"text-xs tabular-nums",
				direction === "up" && "text-primary",
				direction === "down" && "text-destructive",
				direction === "flat" && "text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export function Stat({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="stat"
			className={cn("flex flex-col gap-1", className)}
			{...props}
		/>
	);
}

/**
 * A row of stats separated by hairlines — the "DESKTOP | MOBILE | MIX DELTA"
 * footer pattern. Dividers come from the children so the count is free.
 */
export function StatGroup({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="stat-group"
			className={cn(
				"grid auto-cols-fr grid-flow-col divide-x divide-border [&>*:first-child]:pl-0 [&>*:last-child]:pr-0 [&>*]:px-4",
				className,
			)}
			{...props}
		/>
	);
}
