CREATE TABLE "marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" text NOT NULL,
	"kind" text NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"scale" real DEFAULT 1 NOT NULL,
	"z" integer DEFAULT 0 NOT NULL,
	"color" text,
	"points" jsonb,
	"size" real,
	"text" text,
	"font_size" real,
	"width" real,
	"height" real,
	"media_url" text,
	"caption" text,
	"duration_ms" integer,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sign_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"board_color" text DEFAULT 'paper' NOT NULL,
	"host_token" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sign_spaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_space_id_sign_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."sign_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marks_space_visible_idx" ON "marks" USING btree ("space_id") WHERE "marks"."status" = 'visible';--> statement-breakpoint
CREATE INDEX "marks_author_idx" ON "marks" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "sign_spaces_slug_idx" ON "sign_spaces" USING btree ("slug");