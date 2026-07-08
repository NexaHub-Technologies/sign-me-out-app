import { Resend } from "resend";

import { db } from "#/db/index.ts";
import { feedback } from "#/db/schema.ts";
import type { SessionUser } from "#/server/auth.ts";

/**
 * Server-only feedback logic, kept out of `feedback.ts` (the client-importable
 * server fn) for the same reason as orders-core: a client-imported module must
 * contain *only* server fns. Saves the feedback row (the record of truth) and
 * best-effort emails it to the inbox through Resend.
 */

/** Where feedback lands. Falls back to the order inbox. */
const FEEDBACK_INBOX =
	process.env.FEEDBACK_INBOX_EMAIL ||
	process.env.ORDER_INBOX_EMAIL ||
	"nexahubt@gmail.com";

/**
 * Sender for feedback mail. Must be on a Resend-verified domain in production —
 * the default `resend.dev` sandbox address only delivers to the Resend
 * account's own email.
 */
const FROM =
	process.env.ORDER_FROM_EMAIL || "Sign Me Out <onboarding@resend.dev>";

export const FEEDBACK_CATEGORIES = ["bug", "idea", "love", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_MESSAGE_MAX = 2000;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export type FeedbackInput = {
	category: string;
	message: string;
	email: string;
	path: string;
};

type ValidFeedback = {
	category: FeedbackCategory;
	message: string;
	email: string;
	path: string;
};

/** Trim, cap and whitelist-check the feedback. Throws on bad input. */
export function validateFeedback(input: FeedbackInput): ValidFeedback {
	const category = input.category as FeedbackCategory;
	if (!FEEDBACK_CATEGORIES.includes(category)) {
		throw new Error("Pick what your feedback is about");
	}
	const message = input.message.trim().slice(0, FEEDBACK_MESSAGE_MAX);
	if (!message) throw new Error("Tell us what's on your mind");
	const email = input.email.trim().slice(0, 200);
	if (email && !EMAIL_RE.test(email)) {
		throw new Error("That email doesn't look right — or leave it blank");
	}
	const path = input.path.trim().slice(0, 300);
	return { category, message, email, path };
}

/**
 * Save the feedback (the record of truth) and email it to the inbox. The email
 * is best-effort — a send failure is logged, never surfaced to the submitter.
 */
export async function saveAndDeliverFeedback(
	input: FeedbackInput,
	user: SessionUser | null,
): Promise<{ ok: true }> {
	const clean = validateFeedback(input);

	const [row] = await db
		.insert(feedback)
		.values({
			category: clean.category,
			message: clean.message,
			email: clean.email || null,
			path: clean.path || null,
			userId: user?.id ?? null,
			userEmail: user?.email ?? null,
		})
		.returning({ id: feedback.id });

	try {
		const key = process.env.RESEND_API_KEY;
		if (!key) throw new Error("RESEND_API_KEY is not set");
		const resend = new Resend(key);
		const replyTo = clean.email || user?.email || undefined;
		const { error } = await resend.emails.send(
			{
				from: FROM,
				to: [FEEDBACK_INBOX],
				replyTo,
				subject: `Feedback (${clean.category}) — Sign Me Out`,
				html: feedbackHtml(clean, user),
				text: feedbackText(clean, user),
			},
			{ idempotencyKey: `feedback-inbox/${row.id}` },
		);
		if (error) throw new Error(error.message);
	} catch (err) {
		console.error(
			"Feedback email failed (row saved):",
			err instanceof Error ? err.message : err,
		);
	}

	return { ok: true };
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function feedbackRows(
	fb: ValidFeedback,
	user: SessionUser | null,
): [string, string][] {
	return [
		["Category", fb.category],
		["From", user ? `${user.name} (${user.email ?? "no email"})` : "Anonymous"],
		["Reply-to", fb.email || "—"],
		["Page", fb.path || "—"],
	];
}

function feedbackText(fb: ValidFeedback, user: SessionUser | null): string {
	return [
		`Feedback (${fb.category})`,
		"",
		...feedbackRows(fb, user).map(([label, value]) => `${label}: ${value}`),
		"",
		fb.message,
	].join("\n");
}

function feedbackHtml(fb: ValidFeedback, user: SessionUser | null): string {
	const rows = feedbackRows(fb, user)
		.map(
			([label, value]) =>
				`<tr>
				<td style="padding:8px 16px 8px 0;font-size:13px;color:#8a887f;vertical-align:top;white-space:nowrap;">${label}</td>
				<td style="padding:8px 0;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
			</tr>`,
		)
		.join("");
	return `<div style="margin:0;padding:32px 16px;background:#f1efe8;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1b1b19;">
	<div style="max-width:560px;margin:0 auto;background:#f6f8fc;border:1px solid #dbe4f0;border-radius:16px;padding:32px;">
		<p style="margin:0;font-family:'Segoe Script','Comic Sans MS',cursive;font-size:20px;color:#1d4ed8;transform:rotate(-2deg);">Sign Me Out</p>
		<h1 style="margin:16px 0 0;font-size:22px;line-height:1.3;">Someone left feedback</h1>
		<p style="margin:16px 0 0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(fb.message)}</p>
		<table role="presentation" style="margin-top:20px;width:100%;border-top:1px solid #e4e1d6;border-collapse:collapse;">${rows}</table>
		<p style="margin:24px 0 0;font-size:12px;color:#8a887f;">Sign Me Out — feedback from the in-app pill.</p>
	</div>
</div>`;
}
