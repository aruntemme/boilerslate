"use client";

/**
 * Streamed answer with a caret, inline sources and follow-up prompts.
 *
 * `useStreamedText` is a convenience for demos and for replaying a completed
 * response; in production feed `text` straight from your stream and let this
 * render whatever has arrived so far.
 */
import { cn } from "@boilerslate/ui/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

export interface StreamSource {
	id: string;
	title: string;
	host: string;
	url?: string;
}

/** Reveals `full` one character at a time. Restarts whenever `full` changes. */
export function useStreamedText(full: string, charsPerTick = 2, tickMs = 24) {
	const [shown, setShown] = useState("");

	useEffect(() => {
		setShown("");
		let i = 0;
		const id = setInterval(() => {
			i += charsPerTick;
			setShown(full.slice(0, i));
			if (i >= full.length) clearInterval(id);
		}, tickMs);
		return () => clearInterval(id);
	}, [full, charsPerTick, tickMs]);

	return { text: shown, done: shown.length >= full.length };
}

export function StreamingText({
	text,
	streaming = false,
	sources = [],
	followUps = [],
	onFollowUp,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	text: string;
	streaming?: boolean;
	sources?: StreamSource[];
	followUps?: string[];
	onFollowUp?: (prompt: string) => void;
}) {
	return (
		<div
			data-slot="ai-streaming-text"
			className={cn("flex flex-col gap-4", className)}
			{...props}
		>
			<p className="text-sm leading-relaxed">
				{text}
				{streaming && (
					<span
						aria-hidden="true"
						className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground align-text-bottom"
					/>
				)}
			</p>

			{sources.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs">
						{sources.length} {sources.length === 1 ? "source" : "sources"}
					</span>
					<div className="flex flex-wrap gap-2">
						{sources.map((s) => (
							<a
								key={s.id}
								href={s.url ?? "#"}
								className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
							>
								<span className="font-medium">{s.title}</span>
								<span className="text-muted-foreground">{s.host}</span>
								<ArrowUpRight className="size-3 text-muted-foreground" />
							</a>
						))}
					</div>
				</div>
			)}

			{followUps.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs">Follow-ups</span>
					<div className="flex flex-col items-start gap-1.5">
						{followUps.map((f) => (
							<button
								key={f}
								type="button"
								onClick={() => onFollowUp?.(f)}
								className="rounded-md border border-transparent bg-muted/60 px-2.5 py-1.5 text-left text-sm transition-colors hover:border-border hover:bg-muted"
							>
								{f}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
