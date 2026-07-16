ALTER TABLE "profiles" ADD COLUMN "spaces_unlocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sign_spaces" ADD COLUMN "is_premium" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: every pre-existing space was opened under the old pay-to-create
-- model (₦1,000 up front), so they are all premium, and their owners have
-- already paid for the right to open more boards.
UPDATE "sign_spaces" SET "is_premium" = true;--> statement-breakpoint
UPDATE "profiles" p SET "spaces_unlocked_at" = now()
  WHERE EXISTS (SELECT 1 FROM "sign_spaces" s WHERE s."owner_id" = p."id");
