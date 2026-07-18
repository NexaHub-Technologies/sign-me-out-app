import type { ComponentType } from "react";

import { FrameMockup } from "#/features/mockup-3d/products/frame-mockup.tsx";
import { HoodieMockup } from "#/features/mockup-3d/products/hoodie-mockup.tsx";
import { MugMockup } from "#/features/mockup-3d/products/mug-mockup.tsx";
import { TshirtMockup } from "#/features/mockup-3d/products/tshirt-mockup.tsx";
import type { MockupProps } from "#/features/mockup-3d/types.ts";

/**
 * productId -> 3D mockup component. This is the swap point: today every
 * entry is procedural three.js geometry (boxes/cylinders); once real sourced
 * models are available, swapping one in is a matter of pointing that
 * product's entry at a new component (e.g. one built on `useGLTF`) — nothing
 * else in this feature needs to change.
 *
 * Only catalogue products with real geometry appear here (see
 * order-options.ts for the full catalogue) — `tote`, `cap`, and `cup` (travel
 * cup) aren't covered yet and keep the flat product photo on /customize.
 */
export const MOCKUP_PRODUCTS: Record<string, ComponentType<MockupProps>> = {
	tee: TshirtMockup,
	hoodie: HoodieMockup,
	mug: MugMockup,
	framed: FrameMockup,
};

export type MockupProductId = keyof typeof MOCKUP_PRODUCTS;

export function hasMockup(productId: string): boolean {
	return productId in MOCKUP_PRODUCTS;
}
