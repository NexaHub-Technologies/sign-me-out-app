/**
 * The free-tier / unlock pricing model, shared by server enforcement and
 * client UI so both quote the same numbers.
 *
 * Every account may hold one free board; all boards start free-tier (capped
 * guest marks, no exports or voice notes). A flat ₦1,000 unlock lifts a
 * board's limits, and any unlock also lets the account open as many boards
 * as it likes. The host's own marks never count toward the free cap — their
 * welcome note shouldn't eat the taste guests get.
 */

/** Visible guest marks (of any kind) a free-tier board can hold. */
export const FREE_MARK_LIMIT = 5;

/** Flat per-board unlock price, in kobo (₦1,000). */
export const UNLOCK_PRICE_KOBO = 100_000;

/** Kobo → "₦1,000" for buttons and banners. */
export function formatNaira(kobo: number): string {
	return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

/**
 * Free-tier rules for placing a mark. Throws with the user-facing message when
 * the mark isn't allowed; premium boards always pass. `guestCount` is the
 * board's visible marks not authored by its owner; the owner is exempt from
 * the cap (but not from the voice gate).
 */
export function assertMarkAllowed(
	kind: string,
	opts: { isPremium: boolean; isOwner: boolean; guestCount: number },
): void {
	if (opts.isPremium) return;
	if (kind === "voice") {
		throw new Error("Voice notes need this board unlocked by its host");
	}
	if (!opts.isOwner && opts.guestCount >= FREE_MARK_LIMIT) {
		throw new Error(
			`This free board is full (${FREE_MARK_LIMIT} marks) — the host can unlock unlimited signing`,
		);
	}
}
