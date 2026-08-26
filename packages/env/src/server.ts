import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),

		// Master key for provider credentials stored per organization.
		// Required only if you store keys through the settings UI; env-var-only
		// deployments can leave it unset.
		ENCRYPTION_KEY: z.string().min(32).optional(),

		// Fallback provider credentials. Used when an organization has not
		// stored its own key, which is the normal case for single-tenant
		// deployments.
		ANTHROPIC_API_KEY: z.string().optional(),
		OPENAI_API_KEY: z.string().optional(),
		GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
		COMPATIBLE_API_KEY: z.string().optional(),
		COMPATIBLE_API_KEY_BASE_URL: z.url().optional(),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
