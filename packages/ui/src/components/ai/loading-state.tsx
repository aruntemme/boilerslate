"use client";

/**
 * Loading state for agent work that takes long enough to need narrating.
 *
 * Shows a shimmering label and the elapsed time, so a slow response reads as
 * "working" rather than "broken". Pass `startedAt` to keep the timer honest
 * across re-mounts; otherwise it starts when the component does.
 */
import { cn } from "@boilerslate/ui/lib/utils";
import { useEffect, useState } from "react";

export type LoaderVariant = "grid" | "dots" | "orbit";

function GridGlyph() {
	return (
		<span className="grid grid-cols-3 gap-0.5" aria-hidden="true">
			{Array.from({ length: 9 }, (_, i) => (
				<span
					key={`cell-${i + 1}`}
					className="size-1 rounded-[1px] bg-current opacity-30"
					style={{
						animation: "ai-pulse 1.2s ease-in-out infinite",
						animationDelay: `${(i % 3) * 0.12 + Math.floor(i / 3) * 0.08}s`,
					}}
				/>
			))}
		</span>
	);
}

function DotsGlyph() {
	return (
		<span className="flex items-center gap-1" aria-hidden="true">
			{[0, 1, 2].map((i) => (
				<span
					key={`dot-${i + 1}`}
					className="size-1.5 rounded-full bg-current opacity-30"
					style={{
						animation: "ai-pulse 1s ease-in-out infinite",
						animationDelay: `${i * 0.15}s`,
					}}
				/>
			))}
		</span>
	);
}

function OrbitGlyph() {
	return (
		<span
			aria-hidden="true"
			className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"
			style={{ animationDuration: "0.9s" }}
		/>
	);
}

const GLYPHS: Record<LoaderVariant, () => React.JSX.Element> = {
	grid: GridGlyph,
	dots: DotsGlyph,
	orbit: OrbitGlyph,
};

function formatElapsed(ms: number) {
	const seconds = ms / 1000;
	if (seconds < 60) return `${seconds.toFixed(1)}s`;
	const m = Math.floor(seconds / 60);
	return `${m}m ${Math.floor(seconds % 60)}s`;
}

export function LoadingState({
	label = "Working",
	variant = "grid",
	startedAt,
	showElapsed = true,
	className,
	...props
}: React.ComponentProps<"div"> & {
	label?: string;
	variant?: LoaderVariant;
	/** Epoch ms the work began. Defaults to when this mounted. */
	startedAt?: number;
	showElapsed?: boolean;
}) {
	const [start] = useState(() => startedAt ?? Date.now());
	const [now, setNow] = useState(start);

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 100);
		return () => clearInterval(id);
	}, []);

	const Glyph = GLYPHS[variant];

	return (
		<div
			data-slot="ai-loading-state"
			role="status"
			aria-live="polite"
			className={cn(
				"flex items-center gap-2.5 text-muted-foreground text-sm",
				className,
			)}
			{...props}
		>
			<style>{"@keyframes ai-pulse{0%,100%{opacity:.25}50%{opacity:1}}"}</style>
			<Glyph />
			<span className="animate-pulse font-medium">{label}</span>
			{showElapsed && (
				<span className="font-mono text-muted-foreground/70 text-xs tabular-nums">
					{formatElapsed(now - start)}
				</span>
			)}
		</div>
	);
}
