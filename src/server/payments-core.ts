import { and, eq, isNull } from "drizzle-orm";
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
 */

/** One-time charge to open a sign-out space, in kobo (₦1,000). */
export const PRICE_KOBO = 100_000;

const PAYSTACK = "https://api.paystack.co";

function secretKey(): string {
	const key = process.env.PAYSTACK_SECRET_KEY;
	if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
	return key;
}

/**
 * Start a Paystack transaction for opening a space. Requires a signed-in user
 * (we charge their account email). Records a `pending` payment and returns the
 * access code the browser popup resumes, plus our reference.
 */
export async function createSpacePayment(): Promise<{
	accessCode: string;
	reference: string;
}> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to open a space");
	if (!user.email) throw new Error("Your account has no email for payment");

	const reference = `smo_${nanoid(20)}`;

	await db.insert(payments).values({
		reference,
		email: user.email,
		amount: PRICE_KOBO,
		ownerId: user.id,
	});

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
 * Verify a payment reference with Paystack and mark it `success`. Throws unless
 * the transaction belongs to `userId`, is still unconsumed (no space yet), is
 * `success`, and paid exactly PRICE_KOBO. Safe to call more than once.
 */
export async function assertSpacePaymentPaid(
	reference: string,
	userId: string,
): Promise<void> {
	const [row] = await db
		.select()
		.from(payments)
		.where(and(eq(payments.reference, reference), eq(payments.ownerId, userId)))
		.limit(1);
	if (!row) throw new Error("Payment not found");
	if (row.spaceId) throw new Error("This payment has already been used");

	const res = await fetch(`${PAYSTACK}/transaction/verify/${reference}`, {
		headers: { Authorization: `Bearer ${secretKey()}` },
	});
	const body = (await res.json()) as {
		status: boolean;
		data?: { status: string; amount: number };
	};
	if (
		!res.ok ||
		!body.status ||
		body.data?.status !== "success" ||
		body.data?.amount !== PRICE_KOBO
	) {
		await db
			.update(payments)
			.set({ status: "failed", updatedAt: new Date().toISOString() })
			.where(and(eq(payments.reference, reference), isNull(payments.spaceId)));
		throw new Error("Payment was not completed");
	}

	await db
		.update(payments)
		.set({ status: "success", updatedAt: new Date().toISOString() })
		.where(eq(payments.reference, reference));
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

/**
 * Start a Paystack transaction for a merchandise order. Inserts a `pending`
 * row in `merch_orders` and returns the access code + reference the browser
 * popup needs to resume.
 */
export async function createMerchPayment(
	productId: string,
	qty: number,
	orderDetails: {
		size: string;
		colourId: string;
		personalisation: string;
		boardRef: string;
		name: string;
		email: string;
		phone: string;
		address: string;
		notes: string;
	},
): Promise<{ accessCode: string; reference: string }> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to place an order");
	if (!user.email) throw new Error("Your account has no email for payment");

	const amount = calcMerchTotal(productId, qty);
	const reference = `smo_merch_${nanoid(16)}`;

	await db.insert(merchOrders).values({
		reference,
		productId,
		size: orderDetails.size || null,
		colourId: orderDetails.colourId,
		qty,
		personalisation: orderDetails.personalisation || null,
		boardRef: orderDetails.boardRef || null,
		name: orderDetails.name,
		email: orderDetails.email,
		phone: orderDetails.phone,
		address: orderDetails.address,
		notes: orderDetails.notes || null,
		amount,
		ownerId: user.id,
	});

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
 * Verify a merchandise payment reference with Paystack and mark it `paid`.
 * Throws unless the transaction belongs to `userId`, is still `pending`, and
 * the amount matches. Safe to call more than once.
 */
export async function assertMerchPaymentPaid(
	reference: string,
	userId: string,
): Promise<void> {
	const [row] = await db
		.select()
		.from(merchOrders)
		.where(
			and(
				eq(merchOrders.reference, reference),
				eq(merchOrders.ownerId, userId),
			),
		)
		.limit(1);
	if (!row) throw new Error("Order not found");
	if (row.status === "paid") return; // already verified

	const res = await fetch(`${PAYSTACK}/transaction/verify/${reference}`, {
		headers: { Authorization: `Bearer ${secretKey()}` },
	});
	const body = (await res.json()) as {
		status: boolean;
		data?: { status: string; amount: number };
	};
	if (
		!res.ok ||
		!body.status ||
		body.data?.status !== "success" ||
		body.data?.amount !== row.amount
	) {
		await db
			.update(merchOrders)
			.set({ status: "failed", updatedAt: new Date().toISOString() })
			.where(eq(merchOrders.reference, reference));
		throw new Error("Payment was not completed");
	}

	await db
		.update(merchOrders)
		.set({ status: "paid", updatedAt: new Date().toISOString() })
		.where(eq(merchOrders.reference, reference));
}
