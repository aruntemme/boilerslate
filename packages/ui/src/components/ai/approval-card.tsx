"use client";

/**
 * Human-in-the-loop approval.
 *
 * The agent stops and asks before doing something consequential. Questions are
 * stepped through one at a time so the person answers rather than skims, and
 * `onComplete` only fires once every question has an answer or was skipped.
 */
import { Button } from "@boilerslate/ui/components/button";
import { cn } from "@boilerslate/ui/lib/utils";
import { Check } from "lucide-react";
import { useState } from "react";

export interface ApprovalQuestion {
	id: string;
	question: string;
	options: { id: string; label: string; description?: string }[];
}

export function ApprovalCard({
	questions,
	onComplete,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children" | "onSubmit"> & {
	questions: ApprovalQuestion[];
	/** Called with { questionId: optionId } once the last question is answered. */
	onComplete?: (answers: Record<string, string | null>) => void;
}) {
	const [index, setIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string | null>>({});

	const current = questions[index];
	const isLast = index === questions.length - 1;
	const selected = current ? answers[current.id] : undefined;

	function advance(next: Record<string, string | null>) {
		if (isLast) {
			onComplete?.(next);
			return;
		}
		setIndex((i) => i + 1);
	}

	if (!current) return null;

	return (
		<div
			data-slot="ai-approval-card"
			className={cn(
				"flex flex-col gap-4 rounded-lg border bg-card p-4",
				className,
			)}
			{...props}
		>
			<p className="font-medium text-sm">{current.question}</p>

			<div className="flex flex-col gap-2">
				{current.options.map((option) => {
					const active = selected === option.id;
					return (
						<button
							key={option.id}
							type="button"
							aria-pressed={active}
							onClick={() =>
								setAnswers((a) => ({ ...a, [current.id]: option.id }))
							}
							className={cn(
								"flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
								active
									? "border-primary bg-primary/5 ring-1 ring-primary"
									: "hover:bg-muted",
							)}
						>
							<span className="flex-1">
								<span className="block">{option.label}</span>
								{option.description && (
									<span className="block text-muted-foreground text-xs">
										{option.description}
									</span>
								)}
							</span>
							{active && (
								<Check className="mt-0.5 size-4 shrink-0 text-primary" />
							)}
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-xs tabular-nums">
					{index + 1} / {questions.length}
				</span>
				<div className="ml-auto flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							const next = { ...answers, [current.id]: null };
							setAnswers(next);
							advance(next);
						}}
					>
						Skip
					</Button>
					<Button
						size="sm"
						disabled={!selected}
						onClick={() => advance(answers)}
					>
						{isLast ? "Confirm" : "Continue"}
					</Button>
				</div>
			</div>
		</div>
	);
}
