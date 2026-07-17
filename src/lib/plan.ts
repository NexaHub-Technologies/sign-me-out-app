/**
 * The free-tier / unlock pricing model, shared by server enforcement and
 * client UI so both quote the same numbers.
 *
 * Every account may hold one free board; all boards start free-tier (capped
 * marks, no exports or voice notes). A flat ₦1,000 unlock lifts a board's
 * limits, and any unlock also lets the account open as many boards as it
 * likes. The host's own marks don't count toward the guest cap — their
 * welcome note shouldn't eat the taste guests get — but they have their own
 * higher cap, so a host can't dodge the guest limit by passing their
 * signed-in device around.
 */

/** Visible guest marks (of any kind) a free-tier board can hold. */
export const FREE_MARK_LIMIT = 5;

/** Visible marks the host may place on their own free-tier board. */
export const FREE_HOST_MARK_LIMIT = 10;

/** Flat per-board unlock price, in kobo (₦1,000). */
export const UNLOCK_PRICE_KOBO = 100_000;

/** Kobo → "₦1,000" for buttons and banners. */
export function formatNaira(kobo: number): string {
	return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

/**
 * Free-tier rules for placing a mark. Throws with the user-facing message when
 * the mark isn't allowed; premium boards always pass. `count` is how many
 * visible marks the caller's bucket already holds: the owner's own marks when
 * the owner is placing (capped at FREE_HOST_MARK_LIMIT), guest marks
 * otherwise (capped at FREE_MARK_LIMIT). Voice is gated for everyone.
 */
export function assertMarkAllowed(
	kind: string,
	opts: { isPremium: boolean; isOwner: boolean; count: number },
): void {
	if (opts.isPremium) return;
	if (kind === "voice") {
		throw new Error("Voice notes need this board unlocked by its host");
	}
	if (opts.isOwner) {
		if (opts.count >= FREE_HOST_MARK_LIMIT) {
			throw new Error(
				`You've placed your ${FREE_HOST_MARK_LIMIT} free marks — unlock this board for unlimited signing`,
			);
		}
	} else if (opts.count >= FREE_MARK_LIMIT) {
		throw new Error(
			`This free board is full (${FREE_MARK_LIMIT} marks) — the host can unlock unlimited signing`,
		);
	}
}
