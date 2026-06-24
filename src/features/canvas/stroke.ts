import { getStroke } from "perfect-freehand";

import type { StrokePoint } from "#/features/canvas/types.ts";

const STROKE_OPTIONS = {
	thinning: 0.6,
	smoothing: 0.5,
	streamline: 0.5,
	simulatePressure: true,
};

/**
 * Turn recorded input points into a flat [x0,y0,x1,y1,…] outline for a closed,
 * filled Konva.Line — giving the variable-width marker look.
 */
export function strokeToFlatPath(points: StrokePoint[], size = 8): number[] {
	if (!points.length) return [];
	const outline = getStroke(
		points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
		{ size, ...STROKE_OPTIONS },
	);
	const flat: number[] = [];
	for (const [x, y] of outline) flat.push(x, y);
	return flat;
}
