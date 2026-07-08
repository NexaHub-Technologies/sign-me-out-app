import { createServerFn } from "@tanstack/react-start";

import {
	deliverMerchOrderEmails,
	deliverOrderEmails,
	type OrderInput,
} from "#/server/orders-core.ts";
import { recordPaidMerchOrder } from "#/server/payments-core.ts";

/**
 * Send a customise-page order by email (Resend): the order to our fulfilment
 * inbox plus a confirmation to the buyer. Client-importable — keep this module
 * server-fn-only (see payments.ts for why).
 */
export const placeOrder = createServerFn({ method: "POST" })
	.inputValidator((input: OrderInput) => input)
	.handler(async ({ data }) => deliverOrderEmails(data));

/**
 * Place a paid merchandise order after the Paystack popup succeeds: verify the
 * payment and record it (deferred insert — nothing was written when checkout
 * started), then send the fulfilment + confirmation emails. The amount is
 * re-derived and re-checked server-side, so the client can't dictate the price.
 */
export const placeMerchOrder = createServerFn({ method: "POST" })
	.validator(
		(data: {
			reference: string;
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
	.handler(async ({ data }) => {
		const { reference, productId, qty, ...details } = data;
		await recordPaidMerchOrder(reference, productId, qty, details);
		return deliverMerchOrderEmails(reference);
	});
