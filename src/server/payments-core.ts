import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "#/db/index.ts";
import { merchOrders, payments, profiles, signSpaces } from "#/db/schema.ts";
import { PRODUCTS } from "#/lib/order-options.ts";
import { UNLOCK_PRICE_KOBO } from "#/lib/plan.ts";
import { getSessionUser, isSpaceHost } from "#/server/auth.ts";
import { type OrderInput, validateOrder } from "#/server/order-validation.ts";

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
 *
 * Because of that deferral, a successful charge is only recorded when someone
 * tells us about it. Two things do: the buyer's browser (`onSuccess` →
 * `recordSpaceUnlock` / `recordPaidMerchOrder`) and Paystack's webhook
 * (`applyPaystackReference`, see routes/v1/webhooks/paystack.ts). The browser
 * may never come back — closed tab, dead battery, flaky network — so the
 * webhook is the one that must not be skipped. Both funnel into the same
 * `applyVerified*` functions, which are idempotent and re-validate everything,
 * so whichever arrives first wins and the second is a no-op.
 */

const PAYSTACK = "https://api.paystack.co";

/** Also used by the webhook route to check the `x-paystack-signature` HMAC. */
export function paystackSecretKey(): string {
	const key = process.env.PAYSTACK_SECRET_KEY;
	if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
	return key;
}

type PaystackMetadata = {
	userId?: string;
	purpose?: string;
	productId?: string;
	spaceId?: string;
	/**
	 * The full merchandise order, echoed back to us by Paystack on verify. It
	 * rides along in metadata precisely so the webhook can record the order
	 * without the buyer's browser — nothing else persists the delivery details
	 * before payment.
	 */
	order?: OrderInput;
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
		headers: { Authorization: `Bearer ${paystackSecretKey()}` },
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
 * Start a Paystack transaction to unlock a space (full features; any unlock
 * also opens multi-board creation for the payer). Host-only, and the host
 * must be signed in (we charge their account email). Returns the access code
 * the browser popup resumes, our reference, and the flat unlock amount. No DB
 * row is written yet — that happens only after the payment is verified (see
 * `recordSpaceUnlock`).
 */
export async function createSpaceUnlockPayment(slug: string): Promise<{
	accessCode: string;
	reference: string;
	amountKobo: number;
}> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to unlock this board");
	if (!user.email) throw new Error("Your account has no email for payment");

	const [space] = await db
		.select({
			id: signSpaces.id,
			isPremium: signSpaces.isPremium,
			hostToken: signSpaces.hostToken,
			ownerId: signSpaces.ownerId,
		})
		.from(signSpaces)
		.where(eq(signSpaces.slug, slug))
		.limit(1);
	if (!space) throw new Error("Space not found");
	if (!isSpaceHost(space, user)) {
		throw new Error("Only the host can unlock this board");
	}
	if (space.isPremium) throw new Error("This board is already unlocked");

	const amount = UNLOCK_PRICE_KOBO;
	const reference = `smo_unlock_${nanoid(16)}`;

	const res = await fetch(`${PAYSTACK}/transaction/initialize`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${paystackSecretKey()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email: user.email,
			amount,
			currency: "NGN",
			reference,
			metadata: { userId: user.id, purpose: "unlock_space", spaceId: space.id },
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

	return { accessCode: body.data.access_code, reference, amountKobo: amount };
}

/**
 * Apply a already-verified unlock payment: record it (deferred insert,
 * `spaceId` set immediately — the row's existence spends the reference), flip
 * the space premium, and stamp the payer's account unlock if this was their
 * first. Session-free, so the webhook can call it with the payer taken from
 * the verified transaction metadata. Idempotent.
 */
export async function applyVerifiedUnlock(opts: {
	reference: string;
	userId: string;
	spaceId: string;
	email: string;
	paidAmount: number;
}): Promise<void> {
	if (opts.paidAmount !== UNLOCK_PRICE_KOBO) {
		throw new Error("Payment amount did not match");
	}

	const [space] = await db
		.select({ id: signSpaces.id })
		.from(signSpaces)
		.where(eq(signSpaces.id, opts.spaceId))
		.limit(1);
	if (!space) throw new Error("Space not found");

	// Record the verified payment now (not when checkout started). Idempotent:
	// a repeat call won't create a second row for the same reference.
	await db
		.insert(payments)
		.values({
			reference: opts.reference,
			email: opts.email,
			amount: opts.paidAmount,
			status: "success",
			ownerId: opts.userId,
			spaceId: space.id,
		})
		.onConflictDoNothing();

	const [row] = await db
		.select()
		.from(payments)
		.where(eq(payments.reference, opts.reference))
		.limit(1);
	if (!row) throw new Error("Payment could not be recorded");
	if (row.ownerId && row.ownerId !== opts.userId) {
		throw new Error("This payment belongs to another account");
	}
	// A row pointing elsewhere (or nulled by a deleted space) is already spent.
	if (row.spaceId !== space.id) {
		throw new Error("This payment has already been used");
	}

	const now = new Date().toISOString();
	await db.transaction(async (tx) => {
		await tx
			.update(signSpaces)
			.set({ isPremium: true, updatedAt: now })
			.where(eq(signSpaces.id, space.id));
		// First unlock stamps the account; later unlocks leave the stamp alone.
		// Upsert so a profile row missing its auth trigger still gets stamped.
		await tx
			.insert(profiles)
			.values({ id: opts.userId, spacesUnlockedAt: now })
			.onConflictDoUpdate({
				target: profiles.id,
				set: {
					spacesUnlockedAt: sql`coalesce(${profiles.spacesUnlockedAt}, ${now})`,
				},
			});
	});
}

/**
 * Verify an unlock payment with Paystack and apply it. Throws unless the
 * transaction succeeded, was started by this signed-in user for this space,
 * and paid the flat unlock price. Safe to call more than once for the same
 * space (idempotent retry of a flaky completion).
 */
export async function recordSpaceUnlock(
	reference: string,
	slug: string,
): Promise<void> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to unlock this board");

	const [space] = await db
		.select({ id: signSpaces.id })
		.from(signSpaces)
		.where(eq(signSpaces.slug, slug))
		.limit(1);
	if (!space) throw new Error("Space not found");

	const txn = await verifyPaystack(reference);
	if (txn.metadata?.purpose !== "unlock_space") {
		throw new Error("This payment was for something else");
	}
	if (txn.metadata.userId !== user.id) {
		throw new Error("This payment belongs to another account");
	}
	if (txn.metadata.spaceId !== space.id) {
		throw new Error("This payment was for a different board");
	}

	await applyVerifiedUnlock({
		reference,
		userId: user.id,
		spaceId: space.id,
		email: txn.email || user.email || "",
		paidAmount: txn.amount,
	});
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
 * Start a Paystack transaction for a merchandise order. The order is validated
 * against the catalogue first (`validateOrder` — integer qty within range,
 * real product/colour/size, contact details present) so a malformed or
 * scaled-down order can never reach the charge. The total is fixed
 * server-side (product price × qty) so the client can't tamper with it.
 *
 * The whole order is attached as Paystack metadata: it's the only copy that
 * survives the buyer closing the tab, and the webhook rebuilds the order from
 * it. No DB row is written yet (see `applyVerifiedMerchOrder`).
 */
export async function createMerchPayment(
	input: OrderInput,
): Promise<{ accessCode: string; reference: string }> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to place an order");
	if (!user.email) throw new Error("Your account has no email for payment");

	const order = validateOrder(input);
	const amount = calcMerchTotal(order.productId, order.qty);
	const reference = `smo_merch_${nanoid(16)}`;

	const res = await fetch(`${PAYSTACK}/transaction/initialize`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${paystackSecretKey()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email: user.email,
			amount,
			currency: "NGN",
			reference,
			metadata: {
				userId: user.id,
				purpose: "merch_order",
				productId: order.productId,
				order: {
					productId: order.productId,
					size: order.size,
					colourId: order.colourId,
					qty: order.qty,
					personalisation: order.personalisation,
					boardRef: order.boardRef,
					name: order.name,
					email: order.email,
					phone: order.phone,
					address: order.address,
					notes: order.notes,
				} satisfies OrderInput,
			},
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
 * Record an already-verified merchandise order. Re-validates the order and
 * re-derives the total from the catalogue, then checks it against what
 * Paystack actually charged — so neither a tampered client nor a stale
 * metadata blob can under-pay or swap the product. Session-free so the webhook
 * can call it. Idempotent (unique reference).
 */
export async function applyVerifiedMerchOrder(opts: {
	reference: string;
	userId: string;
	input: OrderInput;
	paidAmount: number;
}): Promise<void> {
	const order = validateOrder(opts.input);
	const amount = calcMerchTotal(order.productId, order.qty);
	if (opts.paidAmount !== amount) {
		throw new Error("Payment amount did not match");
	}

	await db
		.insert(merchOrders)
		.values({
			reference: opts.reference,
			productId: order.productId,
			size: order.size || null,
			colourId: order.colourId,
			qty: order.qty,
			personalisation: order.personalisation || null,
			boardRef: order.boardRef || null,
			name: order.name,
			email: order.email,
			phone: order.phone,
			address: order.address,
			notes: order.notes || null,
			amount,
			status: "paid",
			ownerId: opts.userId,
		})
		.onConflictDoNothing();
}

/**
 * Verify a merchandise payment with Paystack and record the paid order
 * (deferred insert). Throws unless the transaction succeeded and was started
 * by this signed-in user for this product. Safe to call more than once.
 */
export async function recordPaidMerchOrder(
	reference: string,
	input: OrderInput,
): Promise<void> {
	const user = await getSessionUser();
	if (!user) throw new Error("Sign in to place an order");

	const txn = await verifyPaystack(reference);
	if (txn.metadata?.purpose !== "merch_order") {
		throw new Error("This payment was for something else");
	}
	if (txn.metadata.userId !== user.id) {
		throw new Error("This payment belongs to another account");
	}
	if (txn.metadata.productId !== input.productId) {
		throw new Error("This payment was for a different product");
	}

	await applyVerifiedMerchOrder({
		reference,
		userId: user.id,
		input,
		paidAmount: txn.amount,
	});
}

/**
 * Apply a payment we know only by its reference — the webhook path, where
 * there is no session and no client-supplied order. Everything comes from the
 * transaction Paystack itself confirms: what the payment was for, who made it,
 * and (for merch) the order we attached at initialize.
 *
 * Returns what it applied so the caller can follow up (e.g. send order mail).
 * Unrecognised purposes are ignored rather than thrown, so unrelated events
 * don't make Paystack retry forever.
 */
export async function applyPaystackReference(
	reference: string,
): Promise<{ applied: "unlock" | "merch" | "ignored" }> {
	const txn = await verifyPaystack(reference);
	const meta = txn.metadata;

	if (meta?.purpose === "unlock_space") {
		if (!meta.userId || !meta.spaceId) {
			throw new Error("Unlock payment is missing its metadata");
		}
		await applyVerifiedUnlock({
			reference,
			userId: meta.userId,
			spaceId: meta.spaceId,
			email: txn.email,
			paidAmount: txn.amount,
		});
		return { applied: "unlock" };
	}

	if (meta?.purpose === "merch_order") {
		if (!meta.userId || !meta.order) {
			throw new Error("Merch payment is missing its metadata");
		}
		await applyVerifiedMerchOrder({
			reference,
			userId: meta.userId,
			input: meta.order,
			paidAmount: txn.amount,
		});
		return { applied: "merch" };
	}

	return { applied: "ignored" };
}
