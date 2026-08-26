CREATE TABLE "ai_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"api_key_encrypted" text,
	"api_key_hint" text,
	"base_url" text,
	"enabled_models" jsonb,
	"available_models" jsonb,
	"last_checked_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"active_provider_id" text,
	"active_model" text,
	"system_prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_provider" ADD CONSTRAINT "ai_provider_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_active_provider_id_ai_provider_id_fk" FOREIGN KEY ("active_provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_provider_org_name_uidx" ON "ai_provider" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "ai_provider_organizationId_idx" ON "ai_provider" USING btree ("organization_id");