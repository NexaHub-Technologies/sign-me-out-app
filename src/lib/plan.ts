/**
 * The free-tier / unlock pricing model, shared by server enforcement and
 * client UI so both quote the same numbers.
 *
 * Every account may hold one free board; all boards start free-tier (capped
 * marks, no exports or voice notes). Paying the unlock on a board lifts its
 * limits, and the first unlock (₦1,200) also lets the account open more
 * boards — each of which unlocks for ₦1,000.
 */

/** Visible marks (of any kind) a free-tier board can hold. */
export const FREE_MARK_LIMIT = 5;

/** Per-board unlock once the account already has its first unlock, in kobo (₦1,000). */
export const UNLOCK_PRICE_KOBO = 100_000;

/** First-ever unlock — also opens multi-board creation, in kobo (₦1,200). */
export const FIRST_UNLOCK_PRICE_KOBO = 120_000;

/** The unlock price quoted to a user, based on whether their account already unlocked. */
export function unlockPriceKobo(accountUnlocked: boolean): number {
	return accountUnlocked ? UNLOCK_PRICE_KOBO : FIRST_UNLOCK_PRICE_KOBO;
}

/** Kobo → "₦1,200" for buttons and banners. */
export function formatNaira(kobo: number): string {
	return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

/**
 * Free-tier rules for placing a mark. Throws with the user-facing message when
 * the mark isn't allowed; premium boards always pass.
 */
export function assertMarkAllowed(
	kind: string,
	isPremium: boolean,
	visibleCount: number,
): void {
	if (isPremium) return;
	if (kind === "voice") {
		throw new Error("Voice notes need this board unlocked by its host");
	}
	if (visibleCount >= FREE_MARK_LIMIT) {
		throw new Error(
			`This free board is full (${FREE_MARK_LIMIT} marks) — the host can unlock unlimited signing`,
		);
	}
}
