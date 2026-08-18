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
	.validator((input: OrderInput) => input)
	.handler(async ({ data }) => deliverOrderEmails(data));

/**
 * Place a paid merchandise order after the Paystack popup succeeds: verify the
 * payment and record it (deferred insert — nothing was written when checkout
 * started), then send the fulfilment + confirmation emails. The order is
 * re-validated and the amount re-derived server-side, so the client can't
 * dictate the price or slip through an off-catalogue order.
 *
 * This is best-effort: if the buyer's browser never gets here, the Paystack
 * webhook records the same order from the transaction metadata instead.
 */
export const placeMerchOrder = createServerFn({ method: "POST" })
	.validator((input: OrderInput & { reference: string }) => {
		const reference = input.reference?.trim();
		if (!reference) throw new Error("Missing payment reference");
		return { ...input, reference };
	})
	.handler(async ({ data }) => {
		const { reference, ...input } = data;
		await recordPaidMerchOrder(reference, input);

		// Past this line the money has moved and the order is stored, so the call
		// must report success. Mail is a follow-up — Resend being down or
		// unconfigured is our problem to chase, not a reason to tell a charged
		// buyer their order failed and send them to pay a second time.
		try {
			return await deliverMerchOrderEmails(reference);
		} catch (err) {
			console.error(
				`Merch order ${reference}: recorded and paid, but sending its email failed:`,
				err,
			);
			return { reference, confirmationSent: false, inboxDelivered: false };
		}
	});
