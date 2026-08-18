/**
 * Pure order validation — the catalogue cross-check shared by the email-only
 * order path and the paid merchandise path.
 *
 * Deliberately free of `db` and `resend` imports: it lives apart from
 * `orders-core.ts` so it can be unit-tested (and imported by payments-core)
 * without a DATABASE_URL. Its only dependency is the browser-safe catalogue.
 */

import {
	COLOURS,
	MAX_QTY,
	PRODUCTS,
	type Product,
	SIZES,
} from "#/lib/order-options.ts";

export type OrderInput = {
	productId: string;
	size: string;
	colourId: string;
	qty: number;
	personalisation: string;
	boardRef: string;
	name: string;
	email: string;
	phone: string;
	address: string;
	notes: string;
};

export type ValidOrder = OrderInput & { product: Product; colourLabel: string };

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const FIELD_MAX = 500;

/** Trim, cap and cross-check the order against the catalogue. Throws on bad input. */
export function validateOrder(input: OrderInput): ValidOrder {
	const clean = { ...input };
	for (const key of [
		"size",
		"personalisation",
		"boardRef",
		"name",
		"email",
		"phone",
		"address",
		"notes",
	] as const) {
		clean[key] = input[key].trim().slice(0, FIELD_MAX);
	}

	const product = PRODUCTS.find((p) => p.id === clean.productId);
	if (!product) throw new Error("Pick something to print");
	const colour = COLOURS.find((c) => c.id === clean.colourId);
	if (!colour) throw new Error("Pick a colour");
	if (product.sizes && !SIZES.includes(clean.size)) {
		throw new Error("Pick a size");
	}
	if (!Number.isInteger(clean.qty) || clean.qty < 1 || clean.qty > MAX_QTY) {
		throw new Error(`Quantity must be between 1 and ${MAX_QTY}`);
	}
	if (!clean.boardRef) {
		throw new Error("Pick the sign-out board we're printing.");
	}
	if (!clean.name || !clean.phone || !clean.address) {
		throw new Error(
			"Add your name, phone number and delivery address so we can reach you.",
		);
	}
	if (!EMAIL_RE.test(clean.email)) {
		throw new Error("Add a valid email so we can confirm your order.");
	}
	return { ...clean, product, colourLabel: colour.label };
}
