import { createServerFn } from "@tanstack/react-start";
import type { OrderInput } from "#/server/orders-core.ts";
import {
	createMerchPayment,
	createSpaceUnlockPayment,
	recordSpaceUnlock,
} from "#/server/payments-core.ts";

/**
 * Start the Paystack transaction that unlocks a board (flat ₦1,000, priced
 * server-side). Client-importable: the handler (and its server-only `db`
 * imports via payments-core) is stripped from the browser bundle and called
 * over RPC. Keep this module server-fn-only.
 */
export const initSpaceUnlock = createServerFn({ method: "POST" })
	.validator((input: { slug: string }) => {
		const slug = input.slug?.trim();
		if (!slug) throw new Error("Missing space");
		return { slug };
	})
	.handler(async ({ data }) => createSpaceUnlockPayment(data.slug));

/**
 * Verify a completed unlock payment and apply it — the board goes premium and
 * any unlock also opens multi-board creation for the payer.
 */
export const completeSpaceUnlock = createServerFn({ method: "POST" })
	.validator((input: { slug: string; reference: string }) => {
		const slug = input.slug?.trim();
		const reference = input.reference?.trim();
		if (!slug || !reference) throw new Error("Missing space or reference");
		return { slug, reference };
	})
	.handler(async ({ data }) => {
		await recordSpaceUnlock(data.reference, data.slug);
		return { ok: true as const };
	});

/**
 * Start a Paystack transaction for a merchandise order. `createMerchPayment`
 * validates the order against the catalogue and derives the total from the
 * product price × qty, so the client can dictate neither the price nor an
 * off-catalogue order.
 */
export const initMerchPayment = createServerFn({ method: "POST" })
	.validator((input: OrderInput) => input)
	.handler(async ({ data }) => createMerchPayment(data));
