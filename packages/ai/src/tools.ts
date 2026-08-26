/**
 * Tools the model can call.
 *
 * Every tool here is scoped to the caller's organization. A tool that reads
 * tenant data must take the organization id from the server-side session and
 * never from the model — the model's arguments are untrusted input, and a
 * model that can be talked into passing another tenant's id is a data leak.
 *
 * `execute` runs on the server. Omit it to forward a call to the client
 * instead (useful for confirmations and UI actions).
 */
import { tool } from "ai";
import { z } from "zod";

export interface ToolContext {
	/** The caller's active organization. Always from the session. */
	organizationId: string | null;
	userId: string;
}

export function createTools(context: ToolContext) {
	return {
		currentTime: tool({
			description:
				"Get the current date and time in UTC. Use this instead of guessing today's date.",
			inputSchema: z.object({}),
			execute: async () => ({ iso: new Date().toISOString() }),
		}),

		whoami: tool({
			description:
				"Get the signed-in user and their active organization. Use when the answer depends on who is asking.",
			inputSchema: z.object({}),
			execute: async () => ({
				userId: context.userId,
				organizationId: context.organizationId,
			}),
		}),

		calculate: tool({
			description:
				"Evaluate an arithmetic expression. Use for any arithmetic rather than working it out yourself.",
			inputSchema: z.object({
				expression: z
					.string()
					.describe("An arithmetic expression, e.g. (1200 * 1.2) / 3"),
			}),
			execute: async ({ expression }) => {
				// Digits and operators only. Never eval() a model's output: the
				// model is an untrusted caller and eval would be remote code
				// execution with extra steps.
				if (!/^[\d\s+\-*/%.()]+$/.test(expression)) {
					return { error: "Only arithmetic characters are allowed." };
				}
				try {
					const result = new Function(
						`"use strict"; return (${expression});`,
					)();
					if (typeof result !== "number" || !Number.isFinite(result)) {
						return { error: "Expression did not evaluate to a finite number." };
					}
					return { result };
				} catch {
					return { error: "Could not evaluate that expression." };
				}
			},
		}),
	};
}

export type AppTools = ReturnType<typeof createTools>;
