import { describe, expect, it } from "vitest";

import {
	assertMarkAllowed,
	FREE_MARK_LIMIT,
	formatNaira,
	UNLOCK_PRICE_KOBO,
} from "#/lib/plan.ts";

describe("formatNaira", () => {
	it("renders kobo as grouped naira", () => {
		expect(formatNaira(UNLOCK_PRICE_KOBO)).toBe("₦1,000");
		expect(formatNaira(50_000)).toBe("₦500");
	});
});

describe("assertMarkAllowed", () => {
	const free = { isPremium: false, isOwner: false, guestCount: 0 };

	it("lets anything onto an unlocked board, even past the free cap", () => {
		expect(() =>
			assertMarkAllowed("voice", {
				isPremium: true,
				isOwner: false,
				guestCount: FREE_MARK_LIMIT + 20,
			}),
		).not.toThrow();
	});

	it("blocks voice notes on a free board for everyone, including the owner", () => {
		expect(() => assertMarkAllowed("voice", free)).toThrow(/unlocked/i);
		expect(() =>
			assertMarkAllowed("voice", { ...free, isOwner: true }),
		).toThrow(/unlocked/i);
	});

	it("admits strokes and text while a free board has guest room", () => {
		expect(() =>
			assertMarkAllowed("stroke", { ...free, guestCount: FREE_MARK_LIMIT - 1 }),
		).not.toThrow();
		expect(() => assertMarkAllowed("text", free)).not.toThrow();
	});

	it("rejects the guest mark that would exceed the free cap", () => {
		expect(() =>
			assertMarkAllowed("stroke", { ...free, guestCount: FREE_MARK_LIMIT }),
		).toThrow(/full/i);
		expect(() =>
			assertMarkAllowed("photo", { ...free, guestCount: FREE_MARK_LIMIT + 3 }),
		).toThrow(/full/i);
	});

	it("never caps the owner's own marks", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: true,
				guestCount: FREE_MARK_LIMIT + 10,
			}),
		).not.toThrow();
	});
});
