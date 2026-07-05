import { createServerFn } from "@tanstack/react-start";

import {
	assertMerchPaymentPaid,
	createMerchPayment,
	createSpacePayment,
} from "#/server/payments-core.ts";

/**
 * Start the ₦1,000 Paystack transaction for opening a space. Client-importable:
 * the handler (and its server-only `db` imports via payments-core) is stripped
 * from the browser bundle and called over RPC. Keep this module server-fn-only.
 */
export const initSpacePayment = createServerFn({ method: "POST" }).handler(
	async () => createSpacePayment(),
);

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
	.handler(async ({ data }) =>
		createMerchPayment(data.productId, data.qty, data),
	);

/**
 * Verify a completed merchandise payment with Paystack. Called after the popup
 * succeeds to confirm the money landed before we place the order.
 */
export const verifyMerchPayment = createServerFn({ method: "POST" })
	.validator((data: { reference: string }) => data)
	.handler(async ({ data }) => {
		const { getSessionUser } = await import("#/server/auth.ts");
		const user = await getSessionUser();
		if (!user) throw new Error("Sign in to verify payment");
		await assertMerchPaymentPaid(data.reference, user.id);
	});
