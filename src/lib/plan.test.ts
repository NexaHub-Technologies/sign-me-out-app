import { describe, expect, it } from "vitest";

import {
	FIRST_UNLOCK_PRICE_KOBO,
	FREE_MARK_LIMIT,
	UNLOCK_PRICE_KOBO,
	assertMarkAllowed,
	formatNaira,
	unlockPriceKobo,
} from "#/lib/plan.ts";

describe("unlockPriceKobo", () => {
	it("quotes the higher first-unlock price to a still-locked account", () => {
		expect(unlockPriceKobo(false)).toBe(FIRST_UNLOCK_PRICE_KOBO);
	});

	it("quotes the per-board price once the account has unlocked", () => {
		expect(unlockPriceKobo(true)).toBe(UNLOCK_PRICE_KOBO);
	});
});

describe("formatNaira", () => {
	it("renders kobo as grouped naira", () => {
		expect(formatNaira(FIRST_UNLOCK_PRICE_KOBO)).toBe("₦1,200");
		expect(formatNaira(UNLOCK_PRICE_KOBO)).toBe("₦1,000");
	});
});

describe("assertMarkAllowed", () => {
	it("lets anything onto an unlocked board, even past the free cap", () => {
		expect(() =>
			assertMarkAllowed("voice", true, FREE_MARK_LIMIT + 20),
		).not.toThrow();
	});

	it("blocks voice notes on a free board regardless of how empty it is", () => {
		expect(() => assertMarkAllowed("voice", false, 0)).toThrow(/unlocked/i);
	});

	it("admits strokes and text while a free board has room", () => {
		expect(() =>
			assertMarkAllowed("stroke", false, FREE_MARK_LIMIT - 1),
		).not.toThrow();
		expect(() => assertMarkAllowed("text", false, 0)).not.toThrow();
	});

	it("rejects the mark that would exceed the free cap", () => {
		expect(() => assertMarkAllowed("stroke", false, FREE_MARK_LIMIT)).toThrow(
			/full/i,
		);
		expect(() =>
			assertMarkAllowed("photo", false, FREE_MARK_LIMIT + 3),
		).toThrow(/full/i);
	});
});
