/**
 * The free-tier / unlock pricing model, shared by server enforcement and
 * client UI so both quote the same numbers.
 *
 * Every account may hold one free board; all boards start free-tier (capped
 * marks, no exports or voice notes). A flat ₦1,000 unlock lifts a board's
 * limits, and any unlock also lets the account open as many boards as it
 * likes. A free board holds at most FREE_MARK_LIMIT marks *in total* — host
 * and guests share that one pool. Within it, the host is capped at
 * FREE_HOST_MARK_LIMIT of their own so a welcome note or two doesn't eat the
 * whole pool, and each guest gets exactly FREE_GUEST_MARK_LIMIT (one
 * signature) so the board reads as real signatures rather than one friend
 * spamming doodles or a host farming extra "guest" marks from their own
 * device.
 */

/** Total visible marks (host + all guests combined) a free-tier board can hold. */
export const FREE_MARK_LIMIT = 5;

/** Visible marks any single guest may place, within the shared FREE_MARK_LIMIT pool. */
export const FREE_GUEST_MARK_LIMIT = 1;

/** Visible marks the host may place, within the shared FREE_MARK_LIMIT pool. */
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
 * visible marks the caller has already placed (owner's own, capped at
 * FREE_HOST_MARK_LIMIT, or this specific guest's own, capped at
 * FREE_GUEST_MARK_LIMIT). `boardTotal` is every visible mark on the board
 * from anyone — the shared FREE_MARK_LIMIT ceiling nobody can cross, host
 * included. Voice is gated for everyone.
 */
export function assertMarkAllowed(
	kind: string,
	opts: {
		isPremium: boolean;
		isOwner: boolean;
		/** Visible marks already placed by this caller (owner or this guest). */
		count: number;
		/** Every visible mark on the board, from anyone (host + guests). */
		boardTotal: number;
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
	} else if (opts.count >= FREE_GUEST_MARK_LIMIT) {
		throw new Error(
			"You've already left your signature on this free board — ask the host to unlock it for unlimited signing",
		);
	}
	if (opts.boardTotal >= FREE_MARK_LIMIT) {
		throw new Error(
			`This free board is full (${FREE_MARK_LIMIT} signatures) — the host can unlock unlimited signing`,
		);
	}
}
