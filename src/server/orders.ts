import { createServerFn } from "@tanstack/react-start";

import {
	deliverMerchOrderEmails,
	deliverOrderEmails,
	type OrderInput,
} from "#/server/orders-core.ts";

/**
 * Send a customise-page order by email (Resend): the order to our fulfilment
 * inbox plus a confirmation to the buyer. Client-importable — keep this module
 * server-fn-only (see payments.ts for why).
 */
export const placeOrder = createServerFn({ method: "POST" })
	.inputValidator((input: OrderInput) => input)
	.handler(async ({ data }) => deliverOrderEmails(data));

/**
 * Confirm a paid merchandise order: sends the fulfilment email and buyer
 * confirmation. Called after Paystack payment is verified.
 */
export const confirmMerchOrder = createServerFn({ method: "POST" })
	.validator((data: { reference: string }) => data)
	.handler(async ({ data }) => deliverMerchOrderEmails(data.reference));
