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
	const free = { isPremium: false, isOwner: false, count: 0, boardTotal: 0 };

	it("lets anything onto an unlocked board, even past every free cap", () => {
		expect(() =>
			assertMarkAllowed("voice", {
				isPremium: true,
				isOwner: false,
				count: FREE_HOST_MARK_LIMIT + 20,
				boardTotal: FREE_MARK_LIMIT + 20,
			}),
		).not.toThrow();
	});

	it("blocks voice notes on a free board for everyone, including the owner", () => {
		expect(() => assertMarkAllowed("voice", free)).toThrow(/unlocked/i);
		expect(() =>
			assertMarkAllowed("voice", { ...free, isOwner: true }),
		).toThrow(/unlocked/i);
	});

	it("admits a guest's first mark while the shared pool has room", () => {
		expect(() =>
			assertMarkAllowed("stroke", { ...free, boardTotal: FREE_MARK_LIMIT - 1 }),
		).not.toThrow();
		expect(() => assertMarkAllowed("text", free)).not.toThrow();
	});

	it("blocks a guest's second mark even with room left in the shared pool", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				count: FREE_GUEST_MARK_LIMIT,
				boardTotal: 1,
			}),
		).toThrow(/already left your signature/i);
	});

	it("rejects a fresh guest once the shared pool is full", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				count: 0,
				boardTotal: FREE_MARK_LIMIT,
			}),
		).toThrow(/full/i);
	});

	it("lets the owner place marks up to their own cap while the pool has room", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: true,
				count: FREE_HOST_MARK_LIMIT - 1,
				boardTotal: FREE_HOST_MARK_LIMIT - 1,
			}),
		).not.toThrow();
	});

	it("caps the owner at the host limit even with room left in the shared pool", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: true,
				count: FREE_HOST_MARK_LIMIT,
				boardTotal: FREE_HOST_MARK_LIMIT,
			}),
		).toThrow(/free marks/i);
	});

	// Regression: the owner's own-cap check used to `return` before checking
	// the shared total, so a free board could reach guest-pool (5) + host-cap
	// (2) = 7 marks instead of a combined 5. The owner must be blocked by the
	// shared pool even when under their own cap.
	it("blocks the owner once the shared pool is full, even under their own cap", () => {
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: true,
				count: 0,
				boardTotal: FREE_MARK_LIMIT,
			}),
		).toThrow(/full/i);
	});

	it("never lets combined host + guest marks exceed FREE_MARK_LIMIT", () => {
		// 2 owner marks + 3 guest marks = 5, the shared cap — a 6th mark from
		// either the owner or a fresh guest must be rejected.
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: true,
				count: FREE_HOST_MARK_LIMIT - 1,
				boardTotal: FREE_MARK_LIMIT,
			}),
		).toThrow(/full/i);
		expect(() =>
			assertMarkAllowed("stroke", {
				...free,
				isOwner: false,
				count: 0,
				boardTotal: FREE_MARK_LIMIT,
			}),
		).toThrow(/full/i);
	});
});
