"use client";

/**
 * Chat transcript.
 *
 * Renders messages and auto-scrolls to the newest one, but only when the
 * reader is already at the bottom — yanking someone back down while they are
 * reading history is worse than a stale scroll position.
 *
 * Pair with <PromptBar /> for the composer.
 */
import { Avatar, AvatarFallback } from "@boilerslate/ui/components/avatar";
import { cn } from "@boilerslate/ui/lib/utils";
import { type ReactNode, useEffect, useRef } from "react";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: ReactNode;
	/** Rendered under the message, e.g. a Thinking or ToolChips block. */
	footer?: ReactNode;
}

export function Chat({
	messages,
	userInitials = "You",
	assistantInitials = "AI",
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	messages: ChatMessage[];
	userInitials?: string;
	assistantInitials?: string;
}) {
	const endRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		// Within 100px of the bottom counts as "following along".
		const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
		if (atBottom) endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	return (
		<div
			data-slot="ai-chat"
			ref={scrollRef}
			className={cn("flex flex-col gap-4 overflow-y-auto", className)}
			{...props}
		>
			{messages.map((message) => {
				const isUser = message.role === "user";
				return (
					<div
						key={message.id}
						className={cn("flex gap-2.5", isUser && "flex-row-reverse")}
					>
						<Avatar className="size-7 shrink-0">
							<AvatarFallback className="text-[10px]">
								{isUser ? userInitials : assistantInitials}
							</AvatarFallback>
						</Avatar>

						<div
							className={cn(
								"flex max-w-[80%] flex-col gap-2",
								isUser && "items-end",
							)}
						>
							<div
								className={cn(
									"rounded-lg px-3 py-2 text-sm leading-relaxed",
									isUser
										? "bg-primary text-primary-foreground"
										: "bg-muted text-foreground",
								)}
							>
								{message.content}
							</div>
							{message.footer && <div className="w-full">{message.footer}</div>}
						</div>
					</div>
				);
			})}
			<div ref={endRef} />
		</div>
	);
}
