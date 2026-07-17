import { describe, expect, it } from "vitest";

import {
	assertMarkAllowed,
	FREE_GUEST_MARK_LIMIT,
	FREE_HOST_MARK_LIMIT,
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
	const free = { isPremium: false, isOwner: false, count: 0 };

	it("lets anything onto an unlocked board, even past every free cap", () => {
		expect(() =>
			assertMarkAllowed("voice", {
				isPremium: true,
				isOwner: false,
				count: FREE_HOST_MARK_LIMIT + 20,
				guestTotal: FREE_MARK_LIMIT + 20,
			}),
		).not.toThrow();
	});

	it("blocks voice notes on a free board for everyone, including the owner", () => {
		expect(() =>
			assertMarkAllowed("voice", { ...free, guestTotal: 0 }),
		).toThrow(/unlocked/i);
		expect(() =>
			assertMarkAllowed("voice", { ...free, isOwner: true }),
		).toThrow(/unlocked/i);
	});

	it("admits a guest's first mark while the board pool has room", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				count: 0,
				guestTotal: FREE_MARK_LIMIT - 1,
			}),
		).not.toThrow();
		expect(() =>
			assertMarkAllowed("text", { ...free, count: 0, guestTotal: 0 }),
		).not.toThrow();
	});

	it("blocks a guest's second mark even with room left in the pool", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				count: FREE_GUEST_MARK_LIMIT,
				guestTotal: 1,
			}),
		).toThrow(/already left your signature/i);
	});

	it("rejects a fresh guest once the shared pool is full", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				count: 0,
				guestTotal: FREE_MARK_LIMIT,
			}),
		).toThrow(/full/i);
	});

	it("gives the owner their own cap, independent of the guest pool", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: true,
				count: FREE_HOST_MARK_LIMIT - 1,
			}),
		).not.toThrow();
	});

	it("caps the owner at the host limit", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: true,
				count: FREE_HOST_MARK_LIMIT,
			}),
		).toThrow(/free marks/i);
	});
});
