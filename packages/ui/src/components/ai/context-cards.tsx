"use client";

/**
 * Retrieved context chunks with their sources.
 *
 * The point is auditability: when an answer cites retrieved knowledge, this
 * shows exactly which chunk was used and where it came from, so a wrong answer
 * can be traced to a wrong document rather than blamed on the model.
 */
import { Badge } from "@boilerslate/ui/components/badge";
import { cn } from "@boilerslate/ui/lib/utils";
import { FileText } from "lucide-react";

export interface ContextChunk {
	id: string;
	title: string;
	/** The retrieved text itself. */
	content: string;
	source: { name: string; kind: string };
	/** Retrieval score, 0..1. Rendered as a percentage when present. */
	score?: number;
}

export function ContextCards({
	chunks,
	totalChunks,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	chunks: ContextChunk[];
	/** Total retrieved, when more exist than are shown here. */
	totalChunks?: number;
}) {
	return (
		<div
			data-slot="ai-context-cards"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		>
			<div className="flex items-center gap-2 text-muted-foreground text-xs">
				<span>All chunks</span>
				<Badge variant="secondary">{totalChunks ?? chunks.length}</Badge>
			</div>

			{chunks.map((chunk) => (
				<div key={chunk.id} className="rounded-lg border bg-card p-3">
					<div className="flex items-center gap-2">
						<span className="font-medium text-sm">{chunk.title}</span>
						<span className="text-muted-foreground text-xs">
							{chunk.content.length.toLocaleString()} characters
						</span>
						{chunk.score != null && (
							<Badge variant="outline" className="ml-auto">
								{Math.round(chunk.score * 100)}% match
							</Badge>
						)}
					</div>

					<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
						{chunk.content}
					</p>

					<div className="mt-3 flex items-center gap-2">
						<Badge
							variant="outline"
							className="font-mono text-[10px] uppercase"
						>
							{chunk.source.kind}
						</Badge>
						<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<FileText className="size-3" />
							{chunk.source.name}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}
