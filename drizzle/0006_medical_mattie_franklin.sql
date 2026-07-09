CREATE TABLE "mark_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mark_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text DEFAULT '❤️' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mark_reactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mark_reactions" ADD CONSTRAINT "mark_reactions_mark_id_marks_id_fk" FOREIGN KEY ("mark_id") REFERENCES "public"."marks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_reactions" ADD CONSTRAINT "mark_reactions_space_id_sign_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."sign_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mark_reactions_unique_idx" ON "mark_reactions" USING btree ("mark_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "mark_reactions_space_idx" ON "mark_reactions" USING btree ("space_id");