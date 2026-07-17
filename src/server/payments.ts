import { createServerFn } from "@tanstack/react-start";

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
	.inputValidator((input: { slug: string }) => {
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
	.inputValidator((input: { slug: string; reference: string }) => {
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
 * Start a Paystack transaction for a merchandise order. The total is calculated
 * server-side from the product price × qty so the client can't tamper with it.
 */
export const initMerchPayment = createServerFn({ method: "POST" })
	.validator(
		(data: {
			productId: string;
			qty: number;
			size: string;
			colourId: string;
			personalisation: string;
			boardRef: string;
			name: string;
			email: string;
			phone: string;
			address: string;
			notes: string;
		}) => data,
	)
	.handler(async ({ data }) => createMerchPayment(data.productId, data.qty));
