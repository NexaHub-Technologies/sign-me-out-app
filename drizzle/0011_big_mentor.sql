-- Payment rows are only ever written after Paystack confirms the charge
-- (deferred insert), so 'pending'/'failed' were never reachable — the defaults
-- lied about the state machine. Correct them and pin the domain.
--
-- PRE-FLIGHT: rows predating the pay-to-create model could in principle hold
-- another value, and the CHECK will refuse to apply if any do. Verify first:
--   select status, count(*) from payments      group by 1;
--   select status, count(*) from merch_orders  group by 1;
-- A failure here means real data to look at, not a migration to force.

ALTER TABLE "merch_orders" ALTER COLUMN "status" SET DEFAULT 'paid';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'success';--> statement-breakpoint
ALTER TABLE "merch_orders" ADD CONSTRAINT "merch_orders_status_ck" CHECK ("merch_orders"."status" in ('paid'));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_status_ck" CHECK ("payments"."status" in ('success'));