-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "garments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"base_price" numeric(12, 2) NOT NULL,
	"available_sizes" text[] DEFAULT '{"S","M","L","XL"}' NOT NULL,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "garments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"campus" text,
	"avatar_url" text,
	"role" text DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sign_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"occasion" text DEFAULT 'other' NOT NULL,
	"visibility" text DEFAULT 'invite_only' NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"max_signatures" integer DEFAULT 150 NOT NULL,
	"opened_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_spaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "sign_spaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"order_id" uuid,
	"requested_by" uuid NOT NULL,
	"format" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"file_url" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "export_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text DEFAULT 'paystack' NOT NULL,
	"reference" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" text NOT NULL,
	"kind" text NOT NULL,
	"content" jsonb NOT NULL,
	"uv_x" real NOT NULL,
	"uv_y" real NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"scale" real DEFAULT 1 NOT NULL,
	"color" text DEFAULT '#111111' NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signatures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "space_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" uuid,
	"display_name" text,
	"invited_email" text,
	"role" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "space_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "canvas_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" text NOT NULL,
	"kind" text NOT NULL,
	"pos_x" real DEFAULT 0 NOT NULL,
	"pos_y" real DEFAULT 0 NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"scale" real DEFAULT 1 NOT NULL,
	"stroke_points" jsonb,
	"stroke_color" text DEFAULT '#111111',
	"stroke_width" real DEFAULT 4,
	"text_content" text,
	"font_size" real DEFAULT 24,
	"text_color" text DEFAULT '#111111',
	"moment_url" text,
	"moment_caption" text,
	"moment_width" real DEFAULT 200,
	"moment_height" real DEFAULT 200,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_space_id_sign_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."sign_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_space_id_sign_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."sign_spaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_space_id_sign_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."sign_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_memberships" ADD CONSTRAINT "space_memberships_space_id_sign_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."sign_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_items" ADD CONSTRAINT "canvas_items_space_id_sign_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."sign_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sign_spaces_host" ON "sign_spaces" USING btree ("host_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sign_spaces_status" ON "sign_spaces" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_export_jobs_space" ON "export_jobs" USING btree ("space_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_export_jobs_status" ON "export_jobs" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_space" ON "orders" USING btree ("space_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_user" ON "orders" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_payments_order" ON "payments" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_signatures_author" ON "signatures" USING btree ("author_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_signatures_space" ON "signatures" USING btree ("space_id" uuid_ops) WHERE (status = 'visible'::text);--> statement-breakpoint
CREATE INDEX "idx_memberships_space" ON "space_memberships" USING btree ("space_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_memberships_user" ON "space_memberships" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_canvas_items_author" ON "canvas_items" USING btree ("author_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_canvas_items_space" ON "canvas_items" USING btree ("space_id" uuid_ops) WHERE (status = 'visible'::text);
*/