import { createServerFn } from "@tanstack/react-start";

import { createSpacePayment } from "#/server/payments-core.ts";

/**
 * Start the ₦1,000 Paystack transaction for opening a space. Client-importable:
 * the handler (and its server-only `db` imports via payments-core) is stripped
 * from the browser bundle and called over RPC. Keep this module server-fn-only.
 */
export const initSpacePayment = createServerFn({ method: "POST" }).handler(
	async () => createSpacePayment(),
);
