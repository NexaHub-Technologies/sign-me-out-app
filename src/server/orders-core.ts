import { nanoid } from "nanoid";
import { Resend } from "resend";

import {
	COLOURS,
	MAX_QTY,
	PRODUCTS,
	type Product,
	SIZES,
} from "#/lib/order-options.ts";

/**
 * Server-only order-email logic, kept out of `orders.ts` (the client-importable
 * server fn) for the same reason as payments-core: a client-imported module
 * must contain *only* server fns. Sends two emails through Resend — the order
 * to our fulfilment inbox, and a confirmation to the buyer.
 */

/** Where new orders land. Overridable so staging doesn't spam the real inbox. */
export const ORDER_INBOX =
	process.env.ORDER_INBOX_EMAIL || "nexahubt@gmail.com";

/**
 * Sender for order mail. Must be on a Resend-verified domain in production —
 * the default `resend.dev` sandbox address only delivers to the Resend
 * account's own email.
 */
const FROM =
	process.env.ORDER_FROM_EMAIL || "Sign Me Out <onboarding@resend.dev>";

function resendClient(): Resend {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		// Config problem, not the buyer's — keep the detail out of their error.
		console.error("RESEND_API_KEY is not set — cannot send order emails");
		throw new Error(
			"Ordering is temporarily unavailable — please try again later.",
		);
	}
	return new Resend(key);
}

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

type ValidOrder = OrderInput & { product: Product; colourLabel: string };

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

/**
 * Email the order to the fulfilment inbox and a confirmation to the buyer.
 * The inbox send is the order of record — if it fails, the whole call fails.
 * The buyer confirmation is best-effort.
 */
export async function deliverOrderEmails(input: OrderInput): Promise<{
	reference: string;
	confirmationSent: boolean;
}> {
	const order = validateOrder(input);
	const resend = resendClient();
	const reference = `SMO-${nanoid(8).toUpperCase()}`;

	const { error: inboxError } = await resend.emails.send(
		{
			from: FROM,
			to: [ORDER_INBOX],
			replyTo: order.email,
			subject: `New order ${reference} — ${order.product.name} (x${order.qty})`,
			html: inboxHtml(order, reference),
			text: orderText(order, reference),
		},
		{ idempotencyKey: `order-inbox/${reference}` },
	);
	if (inboxError) {
		console.error("Order inbox email failed:", inboxError.message);
		throw new Error(
			"We couldn't send your order just now — please try again in a moment.",
		);
	}

	const { error: confirmError } = await resend.emails.send(
		{
			from: FROM,
			to: [order.email],
			replyTo: ORDER_INBOX,
			subject: `We got your order ${reference} — Sign Me Out`,
			html: confirmationHtml(order, reference),
			text: `Thanks ${order.name}!\n\nWe've received your order and we'll reply with the price and delivery details before anything is charged.\n\n${orderText(order, reference)}`,
		},
		{ idempotencyKey: `order-confirmation/${reference}` },
	);
	if (confirmError) {
		// The order itself landed; don't fail the request over the receipt.
		console.error("Order confirmation email failed:", confirmError.message);
	}

	return { reference, confirmationSent: !confirmError };
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function orderRows(order: ValidOrder): [string, string][] {
	return [
		["Item", order.product.name],
		...(order.product.sizes ? [["Size", order.size] as [string, string]] : []),
		["Colour", order.colourLabel],
		["Quantity", String(order.qty)],
		["Personalisation", order.personalisation || "—"],
		["Sign-out board", order.boardRef],
		["Name", order.name],
		["Email", order.email],
		["Phone / WhatsApp", order.phone],
		["Address", order.address],
		["Notes", order.notes || "—"],
	];
}

function orderText(order: ValidOrder, reference: string): string {
	return [
		`Order ${reference}`,
		"",
		...orderRows(order).map(([label, value]) => `${label}: ${value}`),
	].join("\n");
}

/** Shared shell: paper card on ink-soft background, scrawl header accent. */
function emailShell(heading: string, lede: string, inner: string): string {
	return `<div style="margin:0;padding:32px 16px;background:#f1efe8;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1b1b19;">
	<div style="max-width:560px;margin:0 auto;background:#fbfaf6;border:1px solid #e4e1d6;border-radius:16px;padding:32px;">
		<p style="margin:0;font-family:'Segoe Script','Comic Sans MS',cursive;font-size:20px;color:#15784a;transform:rotate(-2deg);">Sign Me Out</p>
		<h1 style="margin:16px 0 0;font-size:22px;line-height:1.3;">${heading}</h1>
		<p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#4a4a45;">${lede}</p>
		${inner}
		<p style="margin:24px 0 0;font-size:12px;color:#8a887f;">Sign Me Out — print your sign-out on something you'll keep.</p>
	</div>
</div>`;
}

function detailsTable(order: ValidOrder): string {
	const rows = orderRows(order)
		.map(
			([label, value]) =>
				`<tr>
				<td style="padding:8px 16px 8px 0;font-size:13px;color:#8a887f;vertical-align:top;white-space:nowrap;">${label}</td>
				<td style="padding:8px 0;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
			</tr>`,
		)
		.join("");
	return `<table role="presentation" style="margin-top:20px;width:100%;border-top:1px solid #e4e1d6;border-collapse:collapse;">${rows}</table>`;
}

function inboxHtml(order: ValidOrder, reference: string): string {
	return emailShell(
		`New order ${reference}`,
		`${escapeHtml(order.name)} placed an order from the customise page. Reply to this email to reach them directly.`,
		detailsTable(order),
	);
}

function confirmationHtml(order: ValidOrder, reference: string): string {
	return emailShell(
		`We got your order, ${escapeHtml(order.name.split(" ")[0])}!`,
		`Your order <strong>${reference}</strong> is with us. We'll reply with the price and delivery details before anything is charged — nothing to pay yet.`,
		detailsTable(order),
	);
}
