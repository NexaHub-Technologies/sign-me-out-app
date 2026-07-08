import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "#/db/index.ts";
import { merchOrders, payments } from "#/db/schema.ts";
import { PRODUCTS } from "#/lib/order-options.ts";
import { getSessionUser } from "#/server/auth.ts";

/**
 * Server-only payment logic. Kept out of `payments.ts` (which exposes a
 * client-importable server fn) because these plain functions import `db` —
 * a client-imported module must contain *only* server fns, or the dev bundle
 * pulls `drizzle-orm/node-postgres` into the browser ("Buffer is not defined").
 *
 * The DB write is *deferred until after payment*: we never store a row when a
 * checkout starts, only once Paystack confirms the money landed. So a cancelled
 * or abandoned payment leaves no trace, and the `payments` / `merch_orders`
 * tables hold paid rows only.
 */

/** One-time charge to open a sign-out space, in kobo (₦1,000). */
export const PRICE_KOBO = 100_000;

const PAYSTACK = "https://api.paystack.co";

function secretKey(): string {
	const key = process.env.PAYSTACK_SECRET_KEY;
	if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
	return key;
}

type PaystackMetadata = {
	userId?: string;
	purpose?: string;
	productId?: string;
};

type VerifiedTxn = {
	email: string;
	amount: number;
	metadata: PaystackMetadata | null;
};

/**
 * Confirm a reference with Paystack. Throws unless the transaction succeeded.
 * Returns the charged email, amount (kobo) and the metadata we attached at
 * initialize, so callers can re-check the amount and owner before trusting it.
 */
async function verifyPaystack(reference: string): Promise<VerifiedTxn> {
	const res = await fetch(`${PAYSTACK}/transaction/verify/${reference}`, {
		headers: { Authorization: `Bearer ${secretKey()}` },
	});
	const body = (await res.json()) as {
		status: boolean;
		data?: {
			status: string;
			amount: number;
			customer?: { email?: string };
			metadata?: PaystackMetadata | null;
		};
	};
	if (!res.ok || !body.status || body.data?.status !== "success") {
		throw new Error("Payment was not completed");
	}
	return {
		email: body.data.customer?.email ?? "",
		amount: body.data.amount,
		metadata: body.data.metadata ?? null,
	};
}

/**
 * Start a Paystack transaction for opening a space. Requires a signed-in user
 * (we charge their account email). Returns the access code the browser popup
 * resumes, plus our reference. No DB row is written yet — that happens only
 * after the payment is verified (see `assertSpacePaymentPaid`).
 */
export async function createSpacePayment(): Promise<{
	accessCode: string;
	reference: string;
}> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to open a space");
	if (!user.email) throw new Error("Your account has no email for payment");

	const reference = `smo_${nanoid(20)}`;

	const res = await fetch(`${PAYSTACK}/transaction/initialize`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email: user.email,
			amount: PRICE_KOBO,
			currency: "NGN",
			reference,
			metadata: { userId: user.id, purpose: "create_space" },
		}),
	});
	const body = (await res.json()) as {
		status: boolean;
		message: string;
		data?: { access_code: string; reference: string };
	};
	if (!res.ok || !body.status || !body.data) {
		throw new Error(body.message || "Could not start payment");
	}

	return { accessCode: body.data.access_code, reference };
}

/**
 * Verify a space payment with Paystack and record it (deferred insert). Throws
 * unless the transaction succeeded, paid exactly PRICE_KOBO, was started by this
 * user, and hasn't already been consumed by a space. Safe to call more than
 * once — the insert is idempotent (unique reference).
 */
export async function assertSpacePaymentPaid(
	reference: string,
	user: { id: string; email: string | null },
): Promise<void> {
	const txn = await verifyPaystack(reference);
	if (txn.amount !== PRICE_KOBO) {
		throw new Error("Payment amount did not match");
	}
	if (txn.metadata?.userId && txn.metadata.userId !== user.id) {
		throw new Error("This payment belongs to another account");
	}

	// Record the verified payment now (not when checkout started). Idempotent:
	// a repeat call won't create a second row for the same reference.
	await db
		.insert(payments)
		.values({
			reference,
			email: txn.email || user.email || "",
			amount: PRICE_KOBO,
			status: "success",
			ownerId: user.id,
		})
		.onConflictDoNothing();

	const [row] = await db
		.select()
		.from(payments)
		.where(eq(payments.reference, reference))
		.limit(1);
	if (!row) throw new Error("Payment could not be recorded");
	if (row.ownerId && row.ownerId !== user.id) {
		throw new Error("This payment belongs to another account");
	}
	if (row.spaceId) throw new Error("This payment has already been used");
}

/** Consume a verified payment by tying it to the space it paid for. */
export async function consumeSpacePayment(
	reference: string,
	spaceId: string,
): Promise<void> {
	await db
		.update(payments)
		.set({ spaceId, updatedAt: new Date().toISOString() })
		.where(eq(payments.reference, reference));
}

// ---------------------------------------------------------------------------
// Merchandise payments
// ---------------------------------------------------------------------------

/** Calculate the total kobo for a merchandise line (product price × qty). */
export function calcMerchTotal(productId: string, qty: number): number {
	const product = PRODUCTS.find((p) => p.id === productId);
	if (!product) throw new Error("Invalid product");
	return product.priceKobo * qty;
}

type MerchOrderDetails = {
	size: string;
	colourId: string;
	personalisation: string;
	boardRef: string;
	name: string;
	email: string;
	phone: string;
	address: string;
	notes: string;
};

/**
 * Start a Paystack transaction for a merchandise order. The total is fixed
 * server-side (product price × qty) so the client can't tamper with it. Returns
 * the access code + reference the browser popup needs. No DB row is written yet
 * — that happens once the payment is verified (see `recordPaidMerchOrder`).
 */
export async function createMerchPayment(
	productId: string,
	qty: number,
): Promise<{ accessCode: string; reference: string }> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to place an order");
	if (!user.email) throw new Error("Your account has no email for payment");

	const amount = calcMerchTotal(productId, qty);
	const reference = `smo_merch_${nanoid(16)}`;

	const res = await fetch(`${PAYSTACK}/transaction/initialize`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email: user.email,
			amount,
			currency: "NGN",
			reference,
			metadata: { userId: user.id, purpose: "merch_order", productId },
		}),
	});
	const body = (await res.json()) as {
		status: boolean;
		message: string;
		data?: { access_code: string; reference: string };
	};
	if (!res.ok || !body.status || !body.data) {
		throw new Error(body.message || "Could not start payment");
	}

	return { accessCode: body.data.access_code, reference };
}

/**
 * Verify a merchandise payment with Paystack and record the paid order
 * (deferred insert). The amount is recomputed server-side from the product +
 * qty and re-checked against what Paystack charged, so the client can't
 * under-pay or swap the product. Throws unless the transaction succeeded and
 * was started by this user. Safe to call more than once (unique reference).
 */
export async function recordPaidMerchOrder(
	reference: string,
	productId: string,
	qty: number,
	details: MerchOrderDetails,
): Promise<void> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to place an order");

	const amount = calcMerchTotal(productId, qty);
	const txn = await verifyPaystack(reference);
	if (txn.amount !== amount) {
		throw new Error("Payment amount did not match");
	}
	if (txn.metadata?.userId && txn.metadata.userId !== user.id) {
		throw new Error("This payment belongs to another account");
	}
	if (txn.metadata?.productId && txn.metadata.productId !== productId) {
		throw new Error("This payment was for a different product");
	}

	await db
		.insert(merchOrders)
		.values({
			reference,
			productId,
			size: details.size || null,
			colourId: details.colourId,
			qty,
			personalisation: details.personalisation || null,
			boardRef: details.boardRef || null,
			name: details.name,
			email: details.email,
			phone: details.phone,
			address: details.address,
			notes: details.notes || null,
			amount,
			status: "paid",
			ownerId: user.id,
		})
		.onConflictDoNothing();
}
