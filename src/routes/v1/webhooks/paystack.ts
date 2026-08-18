import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

import { deliverMerchOrderEmails } from "#/server/orders-core.ts";
import {
	applyPaystackReference,
	paystackSecretKey,
} from "#/server/payments-core.ts";

/**
 * Paystack webhook — the backstop that makes a payment durable.
 *
 * Everything else in the payment flow depends on the buyer's browser calling
 * back after the popup succeeds. That call is best-effort: a closed tab, a
 * dead battery or a dropped connection loses it, and because the DB write is
 * deferred until after payment, losing it means money changed hands and we
 * hold no record at all. Paystack retries this endpoint until it gets a 2xx,
 * so this is the path that must not be skipped.
 *
 * Trust comes from the `x-paystack-signature` HMAC over the *raw* body — read
 * the body as text and hash that exact string; re-serialising parsed JSON
 * changes the bytes and the signature will never match.
 */

/** HMAC-SHA512 of the raw body, keyed with the secret, compared in constant time. */
function signatureIsValid(rawBody: string, signature: string | null): boolean {
	if (!signature) return false;
	const expected = createHmac("sha512", paystackSecretKey())
		.update(rawBody)
		.digest("hex");
	const a = Buffer.from(expected, "utf8");
	const b = Buffer.from(signature, "utf8");
	// timingSafeEqual throws on a length mismatch, so screen that first.
	return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/v1/webhooks/paystack")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const rawBody = await request.text();

				if (
					!signatureIsValid(
						rawBody,
						request.headers.get("x-paystack-signature"),
					)
				) {
					console.warn("Paystack webhook: bad or missing signature");
					return new Response("Invalid signature", { status: 401 });
				}

				let event: { event?: string; data?: { reference?: string } };
				try {
					event = JSON.parse(rawBody);
				} catch {
					// Signed but unparseable: nothing to retry for.
					return new Response("Bad payload", { status: 400 });
				}

				// Paystack sends many event types; only a completed charge is ours to
				// act on. Anything else is acknowledged so it isn't retried.
				if (event.event !== "charge.success") {
					return Response.json({ ignored: event.event ?? null });
				}

				const reference = event.data?.reference;
				if (!reference) {
					return new Response("Missing reference", { status: 400 });
				}

				try {
					const { applied } = await applyPaystackReference(reference);

					// The order row is the record of truth and is now safely written;
					// mail is a follow-up, so a Resend hiccup must not fail the webhook
					// and trigger endless retries of an already-applied payment.
					if (applied === "merch") {
						try {
							const mail = await deliverMerchOrderEmails(reference);
							if (!mail.inboxDelivered) {
								console.error(
									`Paystack webhook: order ${reference} recorded but fulfilment mail did not send`,
								);
							}
						} catch (err) {
							console.error(
								`Paystack webhook: order ${reference} recorded but its email failed:`,
								err,
							);
						}
					}

					return Response.json({ applied, reference });
				} catch (err) {
					// Non-2xx so Paystack retries — the usual cause is a transient DB
					// or network fault, and applying twice is a no-op.
					console.error(`Paystack webhook: failed to apply ${reference}:`, err);
					return new Response("Could not apply payment", { status: 500 });
				}
			},
		},
	},
});
