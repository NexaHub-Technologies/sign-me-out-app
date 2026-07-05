import { createServerFn } from "@tanstack/react-start";

import { deliverOrderEmails, type OrderInput } from "#/server/orders-core.ts";

/**
 * Send a customise-page order by email (Resend): the order to our fulfilment
 * inbox plus a confirmation to the buyer. Client-importable — keep this module
 * server-fn-only (see payments.ts for why).
 */
export const placeOrder = createServerFn({ method: "POST" })
	.inputValidator((input: OrderInput) => input)
	.handler(async ({ data }) => deliverOrderEmails(data));
