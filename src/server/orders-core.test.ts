import { describe, expect, it } from "vitest";

import { type OrderInput, validateOrder } from "#/server/orders-core.ts";

const base: OrderInput = {
	productId: "tee",
	size: "M",
	colourId: "white",
	qty: 2,
	personalisation: "Class of 2026",
	boardRef: "",
	name: "  Ada Obi  ",
	email: "ada@example.com",
	phone: "0801 234 5678",
	address: "12 Marina Rd, Lagos",
	notes: "",
};

describe("validateOrder", () => {
	it("accepts a complete order and resolves catalogue labels", () => {
		const order = validateOrder(base);
		expect(order.product.name).toBe("Sign-out tee");
		expect(order.colourLabel).toBe("Cotton white");
		expect(order.name).toBe("Ada Obi");
	});

	it("rejects unknown products and colours", () => {
		expect(() => validateOrder({ ...base, productId: "yacht" })).toThrow(
			/pick something/i,
		);
		expect(() => validateOrder({ ...base, colourId: "plaid" })).toThrow(
			/colour/i,
		);
	});

	it("requires a size only for sized products", () => {
		expect(() => validateOrder({ ...base, size: "" })).toThrow(/size/i);
		expect(() =>
			validateOrder({ ...base, productId: "mug", size: "" }),
		).not.toThrow();
	});

	it("bounds the quantity", () => {
		expect(() => validateOrder({ ...base, qty: 0 })).toThrow(/quantity/i);
		expect(() => validateOrder({ ...base, qty: 501 })).toThrow(/quantity/i);
		expect(() => validateOrder({ ...base, qty: 1.5 })).toThrow(/quantity/i);
	});

	it("requires contact details and a plausible email", () => {
		expect(() => validateOrder({ ...base, address: "  " })).toThrow(
			/delivery address/i,
		);
		expect(() => validateOrder({ ...base, email: "not-an-email" })).toThrow(
			/valid email/i,
		);
	});
});
