ALTER TABLE "sign_spaces" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
CREATE INDEX "sign_spaces_owner_idx" ON "sign_spaces" USING btree ("owner_id");