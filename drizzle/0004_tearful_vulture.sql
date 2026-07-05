CREATE TABLE "merch_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"product_id" text NOT NULL,
	"size" text,
	"colour_id" text NOT NULL,
	"qty" integer NOT NULL,
	"personalisation" text,
	"board_ref" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"notes" text,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merch_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "merch_orders_reference_idx" ON "merch_orders" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "merch_orders_owner_idx" ON "merch_orders" USING btree ("owner_id");