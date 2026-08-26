"use client";

/**
 * Composer for agent input.
 *
 * Auto-grows, submits on Enter (Shift+Enter for a newline), and opens an
 * inline picker when you type "@" for a source or "/" for a command. The
 * picker filters as you keep typing and closes on Escape.
 */
import { Button } from "@boilerslate/ui/components/button";
import { cn } from "@boilerslate/ui/lib/utils";
import { ArrowUp, AtSign, Slash, Square } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

export interface PromptOption {
	id: string;
	label: string;
	hint?: string;
}

type Trigger = "@" | "/";

export function PromptBar({
	sources = [],
	commands = [],
	models,
	model,
	onModelChange,
	placeholder = "Ask anything…",
	streaming = false,
	onSubmit,
	onStop,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children" | "onSubmit"> & {
	sources?: PromptOption[];
	commands?: PromptOption[];
	models?: string[];
	model?: string;
	onModelChange?: (model: string) => void;
	placeholder?: string;
	/** True while a response is in flight; swaps send for stop. */
	streaming?: boolean;
	onSubmit?: (value: string) => void;
	onStop?: () => void;
}) {
	const [value, setValue] = useState("");
	const [trigger, setTrigger] = useState<Trigger | null>(null);
	const [query, setQuery] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-grow to fit the content, capped so it cannot eat the viewport.
	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	}, []);

	const options = trigger === "@" ? sources : trigger === "/" ? commands : [];
	const filtered = options.filter((o) =>
		o.label.toLowerCase().includes(query.toLowerCase()),
	);

	function handleChange(next: string) {
		setValue(next);

		const el = textareaRef.current;
		if (el) {
			el.style.height = "auto";
			el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
		}

		// Look at the token being typed, not the whole value, so a "@" earlier
		// in the message does not keep the picker open forever.
		const token = next.split(/\s/).pop() ?? "";
		if (token.startsWith("@") && sources.length > 0) {
			setTrigger("@");
			setQuery(token.slice(1));
		} else if (token.startsWith("/") && commands.length > 0) {
			setTrigger("/");
			setQuery(token.slice(1));
		} else {
			setTrigger(null);
			setQuery("");
		}
	}

	function pick(option: PromptOption) {
		const parts = value.split(/(\s)/);
		// Replace the trailing token with the chosen label.
		for (let i = parts.length - 1; i >= 0; i--) {
			const part = parts[i];
			if (part !== undefined && part.trim() !== "") {
				parts[i] = `${trigger}${option.label} `;
				break;
			}
		}
		setValue(parts.join(""));
		setTrigger(null);
		setQuery("");
		textareaRef.current?.focus();
	}

	function submit() {
		const trimmed = value.trim();
		if (!trimmed) return;
		onSubmit?.(trimmed);
		setValue("");
		setTrigger(null);
	}

	function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Escape") {
			setTrigger(null);
			return;
		}
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	return (
		<div
			data-slot="ai-prompt-bar"
			className={cn(
				"relative flex flex-col gap-2 rounded-lg border bg-card p-2",
				className,
			)}
			{...props}
		>
			{trigger && filtered.length > 0 && (
				<div className="absolute bottom-full left-0 z-10 mb-2 w-64 overflow-hidden rounded-lg border bg-popover shadow-md">
					<div className="border-b px-2.5 py-1.5 text-muted-foreground text-xs">
						{trigger === "@" ? "Sources" : "Commands"}
					</div>
					<ul className="max-h-48 overflow-y-auto py-1">
						{filtered.map((option) => (
							<li key={option.id}>
								<button
									type="button"
									onClick={() => pick(option)}
									className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted"
								>
									{trigger === "@" ? (
										<AtSign className="size-3.5 text-muted-foreground" />
									) : (
										<Slash className="size-3.5 text-muted-foreground" />
									)}
									<span>{option.label}</span>
									{option.hint && (
										<span className="ml-auto text-muted-foreground text-xs">
											{option.hint}
										</span>
									)}
								</button>
							</li>
						))}
					</ul>
				</div>
			)}

			<textarea
				ref={textareaRef}
				rows={1}
				value={value}
				placeholder={placeholder}
				onChange={(e) => handleChange(e.target.value)}
				onKeyDown={onKeyDown}
				className="w-full resize-none bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
			/>

			<div className="flex items-center gap-2">
				{models && models.length > 0 && (
					<select
						aria-label="Model"
						value={model}
						onChange={(e) => onModelChange?.(e.target.value)}
						className="rounded-md border bg-transparent px-2 py-1 text-muted-foreground text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
					>
						{models.map((m) => (
							<option key={m} value={m}>
								{m}
							</option>
						))}
					</select>
				)}

				<span className="text-muted-foreground text-xs">
					{sources.length > 0 && "@ for sources"}
					{sources.length > 0 && commands.length > 0 && " · "}
					{commands.length > 0 && "/ for commands"}
				</span>

				<div className="ml-auto">
					{streaming ? (
						<Button
							size="icon-sm"
							variant="outline"
							onClick={onStop}
							aria-label="Stop"
						>
							<Square className="size-3 fill-current" />
						</Button>
					) : (
						<Button
							size="icon-sm"
							onClick={submit}
							disabled={!value.trim()}
							aria-label="Send"
						>
							<ArrowUp className="size-4" />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
