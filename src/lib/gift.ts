/**
 * Optional "sign with a gift" details a host can attach to a space: a bank
 * account signers can copy to send a cash gift. Validation is shared by the
 * create/edit form and the server fns, so this file must stay client-safe
 * (no server-only imports). A gift is all-or-nothing — either the three fields
 * are present and valid, or there's no gift at all.
 */
export type GiftDetails = {
	bankName: string;
	accountNumber: string;
	accountName: string;
};

export type GiftInput = {
	bankName?: string | null;
	accountNumber?: string | null;
	accountName?: string | null;
};

const NAME_MAX = 60;

/** Nigerian NUBAN account numbers are exactly 10 digits. */
export function isValidAccountNumber(raw: string): boolean {
	return /^\d{10}$/.test(raw.replace(/\s+/g, ""));
}

/**
 * Validate raw gift fields into a stored shape, or `null` when the host left
 * the gift off entirely. Throws a user-facing message when a gift is partially
 * filled or malformed. Reused verbatim on the server so the DB never stores a
 * half-formed gift.
 */
export function normalizeGift(input: GiftInput): GiftDetails | null {
	const bankName = (input.bankName ?? "").trim();
	const accountName = (input.accountName ?? "").trim();
	const accountNumber = (input.accountNumber ?? "").replace(/\s+/g, "");

	// Nothing filled → no gift, and that's fine (the whole feature is optional).
	if (!bankName && !accountName && !accountNumber) return null;

	if (!accountNumber) throw new Error("Add the account number for your gift");
	if (!isValidAccountNumber(accountNumber)) {
		throw new Error("Account number must be 10 digits");
	}
	if (!bankName) throw new Error("Pick the bank for your gift");
	if (bankName.length > NAME_MAX) throw new Error("Bank name is too long");
	if (!accountName) throw new Error("Add the account name for your gift");
	if (accountName.length > NAME_MAX)
		throw new Error("Account name is too long");

	return { bankName, accountNumber, accountName };
}

/** True when a loaded space carries a complete cash gift. */
export function hasGift(input: GiftInput): boolean {
	return Boolean(input.bankName && input.accountNumber && input.accountName);
}
