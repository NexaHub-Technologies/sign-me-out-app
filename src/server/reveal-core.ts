import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { signSpaces } from "#/db/schema.ts";
import { absoluteUrl } from "#/lib/seo.ts";
import { emailShell, FROM, resendClient } from "#/server/orders-core.ts";

/**
 * Server-only reveal logic for the time-capsule feature. A space with a
 * `reveal_at` in the future is "sealed": non-hosts see a countdown and can't
 * see the board yet. There is no scheduled job — the space opens simply because
 * reads compare `reveal_at` to now. The one thing that must fire exactly once is
 * the "it's open!" email blast, so the first read at/after `reveal_at` atomically
 * claims the reveal (stamping `revealed_at`) and emails the signers.
 */

type CapsuleSpace = {
	id: string;
	slug: string;
	title: string;
	revealAt: string | null;
	revealedAt: string | null;
};

/** True while a capsule is still sealed (has a future reveal time). */
export function isSealed(space: { revealAt: string | null }): boolean {
	return !!space.revealAt && new Date(space.revealAt).getTime() > Date.now();
}

/**
 * If a capsule's reveal time has arrived and it hasn't been announced yet, claim
 * the reveal (once, atomically) and email everyone who signed. Best-effort and
 * never throws — a failed blast must not break loading the space.
 */
export async function maybeRevealSpace(space: CapsuleSpace): Promise<void> {
	if (!space.revealAt || space.revealedAt) return;
	if (new Date(space.revealAt).getTime() > Date.now()) return;

	// Atomic claim: only the request that flips revealed_at from NULL sends mail.
	const now = new Date().toISOString();
	const claimed = await db
		.update(signSpaces)
		.set({ revealedAt: now })
		.where(
			and(
				eq(signSpaces.id, space.id),
				isNull(signSpaces.revealedAt),
				lte(signSpaces.revealAt, now),
			),
		)
		.returning({ id: signSpaces.id });
	if (claimed.length === 0) return; // someone else already claimed it

	try {
		await deliverRevealEmails(space);
	} catch (err) {
		console.error(
			"Reveal email blast failed:",
			err instanceof Error ? err.message : err,
		);
	}
}

/** Email everyone who signed that the board is now open. */
async function deliverRevealEmails(space: CapsuleSpace): Promise<void> {
	// Distinct emails of signers (every mark author is an authenticated user).
	const result = await db.execute<{ email: string }>(sql`
		select distinct u.email
		from public.marks m
		join auth.users u on u.id = m.author_id
		where m.space_id = ${space.id} and u.email is not null
	`);
	const emails = result.rows.map((r) => r.email).filter(Boolean);
	if (emails.length === 0) return;

	const resend = resendClient();
	const url = absoluteUrl(`/s/${space.slug}`);
	const html = emailShell(
		`"${space.title}" is open! 🎉`,
		`The sign-out board you signed has been revealed. Come see everyone's signatures, doodles and voice notes.`,
		`<p style="margin:24px 0 0;"><a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9999px;font-weight:600;">Open the board</a></p>
		<p style="margin:16px 0 0;font-size:13px;color:#8a887f;">${url}</p>`,
	);

	await Promise.allSettled(
		emails.map((email) =>
			resend.emails.send(
				{
					from: FROM,
					to: [email],
					subject: `"${space.title}" is open — Sign Me Out`,
					html,
					text: `"${space.title}" has been revealed! See everyone's signatures: ${url}`,
				},
				{ idempotencyKey: `reveal/${space.id}/${email}` },
			),
		),
	);
}
