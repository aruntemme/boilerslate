"use client";

/**
 * Line-numbered code listing, with a unified-diff mode for proposed edits.
 *
 * No syntax highlighting on purpose: it would mean shipping a highlighter and
 * a second colour system that fights the theme. Structure and diff colouring
 * carry the meaning; add a highlighter per project if you need one.
 */
import { cn } from "@boilerslate/ui/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export interface DiffLine {
	type: "add" | "remove" | "context";
	content: string;
}

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<button
			type="button"
			aria-label="Copy code"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				} catch {
					// Clipboard blocked (insecure context or denied permission).
					// Silently ignore: the code is still selectable by hand.
				}
			}}
			className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
		>
			{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
		</button>
	);
}

export function CodeBlock({
	filename,
	code,
	diff,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	filename?: string;
	/** Plain listing. Ignored when `diff` is given. */
	code?: string;
	/** Unified diff. Takes precedence over `code`. */
	diff?: DiffLine[];
}) {
	const lines = diff ? null : (code ?? "").replace(/\n$/, "").split("\n");
	const copyValue = diff ? diff.map((l) => l.content).join("\n") : (code ?? "");

	const added = diff?.filter((l) => l.type === "add").length ?? 0;
	const removed = diff?.filter((l) => l.type === "remove").length ?? 0;

	return (
		<div
			data-slot="ai-code-block"
			className={cn("overflow-hidden rounded-lg border bg-card", className)}
			{...props}
		>
			<div className="flex items-center gap-2 border-b px-3 py-1.5">
				{filename && (
					<code className="font-mono text-muted-foreground text-xs">
						{filename}
					</code>
				)}
				{diff && (
					<span className="flex gap-1.5 font-mono text-xs">
						<span className="text-primary">+{added}</span>
						<span className="text-destructive">−{removed}</span>
					</span>
				)}
				<div className="ml-auto">
					<CopyButton value={copyValue} />
				</div>
			</div>

			<pre className="overflow-x-auto py-2 font-mono text-xs leading-relaxed">
				{diff
					? diff.map((line, i) => (
							<div
								key={`diff-${i + 1}`}
								className={cn(
									"px-3",
									line.type === "add" && "bg-primary/10 text-foreground",
									line.type === "remove" &&
										"bg-destructive/10 text-muted-foreground line-through decoration-destructive/40",
								)}
							>
								<span
									className={cn(
										"select-none pr-2",
										line.type === "add" && "text-primary",
										line.type === "remove" && "text-destructive",
										line.type === "context" && "text-muted-foreground/40",
									)}
								>
									{line.type === "add"
										? "+"
										: line.type === "remove"
											? "−"
											: " "}
								</span>
								{line.content}
							</div>
						))
					: lines?.map((line, i) => (
							<div key={`line-${i + 1}`} className="flex px-3">
								<span className="w-7 shrink-0 select-none text-right text-muted-foreground/40">
									{i + 1}
								</span>
								<span className="pl-3">{line}</span>
							</div>
						))}
			</pre>
		</div>
	);
}
