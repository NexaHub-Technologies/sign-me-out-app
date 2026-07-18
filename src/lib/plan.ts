/**
 * The free-tier / unlock pricing model, shared by server enforcement and
 * client UI so both quote the same numbers.
 *
 * Every account may hold one free board; all boards start free-tier (capped
 * marks, no exports or voice notes). A flat ₦1,000 unlock lifts a board's
 * limits, and any unlock also lets the account open as many boards as it
 * likes. The host's own marks don't count toward the guest cap — their
 * welcome note shouldn't eat the taste guests get — but they have their own
 * (lower) cap, so a host can't dodge the guest limit by passing their
 * signed-in device around. Each guest gets exactly one mark, so the board
 * reads as real signatures rather than one friend spamming doodles.
 */

/** Visible guest marks (of any kind) a free-tier board can hold in total. */
export const FREE_MARK_LIMIT = 5;

/** Visible marks any single guest may place on a free-tier board — one signature each. */
export const FREE_GUEST_MARK_LIMIT = 1;

/** Visible marks the host may place on their own free-tier board. */
export const FREE_HOST_MARK_LIMIT = 2;

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
 * the owner is placing (capped at FREE_HOST_MARK_LIMIT), or this specific
 * guest's own marks otherwise (capped at FREE_GUEST_MARK_LIMIT, and gated
 * again by the board's shared FREE_MARK_LIMIT). Voice is gated for everyone.
 */
export function assertMarkAllowed(
	kind: string,
	opts: {
		isPremium: boolean;
		isOwner: boolean;
		/** Visible marks already placed by this caller (owner or this guest). */
		count: number;
		/** Visible guest marks already on the board, from anyone. Owner-only calls ignore this. */
		guestTotal?: number;
	},
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
		return;
	}
	if (opts.count >= FREE_GUEST_MARK_LIMIT) {
		throw new Error(
			"You've already left your signature on this free board — unlock the board for unlimited signing",
		);
	}
	if ((opts.guestTotal ?? opts.count) >= FREE_MARK_LIMIT) {
		throw new Error(
			`This free board is full (${FREE_MARK_LIMIT} signatures) — the host can unlock unlimited signing`,
		);
	}
}
