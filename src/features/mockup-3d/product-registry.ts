import type { ComponentType } from "react";

import { FrameMockup } from "#/features/mockup-3d/products/frame-mockup.tsx";
import { HoodieMockup } from "#/features/mockup-3d/products/hoodie-mockup.tsx";
import { MugMockup } from "#/features/mockup-3d/products/mug-mockup.tsx";
import { ToteMockup } from "#/features/mockup-3d/products/tote-mockup.tsx";
import { TshirtMockup } from "#/features/mockup-3d/products/tshirt-mockup.tsx";
import type { MockupProps } from "#/features/mockup-3d/types.ts";

/**
 * productId -> 3D mockup component. This is the swap point: swapping in a
 * new/better sourced model for a product is a matter of pointing that
 * product's entry at a new component — nothing else in this feature needs
 * to change. `framed` is still the original procedural placeholder (no
 * sourced model for it yet).
 *
 * Only catalogue products with real geometry appear here (see
 * order-options.ts for the full catalogue) — `cap` and `cup` (travel cup)
 * aren't covered yet and keep the flat product photo on /customize.
 */
export const MOCKUP_PRODUCTS: Record<string, ComponentType<MockupProps>> = {
	tee: TshirtMockup,
	hoodie: HoodieMockup,
	mug: MugMockup,
	tote: ToteMockup,
	framed: FrameMockup,
};

export type MockupProductId = keyof typeof MOCKUP_PRODUCTS;

export function hasMockup(productId: string): boolean {
	return productId in MOCKUP_PRODUCTS;
}
