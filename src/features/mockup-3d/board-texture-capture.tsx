import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Layer, Stage } from "react-konva";

import { captureBoardPNG } from "#/features/canvas/export-canvas.ts";
import { RenderMark } from "#/features/canvas/render-mark.tsx";
import type { Mark } from "#/features/canvas/types.ts";

/**
 * Renders a board's real marks into an off-screen Konva stage (parked outside
 * the viewport, same trick as the hidden text-entry textarea in
 * sign-canvas.tsx) purely to rasterize them, then hands the resulting PNG
 * data URL back via `onCapture`. Nothing here is interactive or visible —
 * it exists only to produce a texture for the 3D mockup.
 */
export function BoardTextureCapture({
	marks,
	backgroundColor,
	onCapture,
}: {
	marks: Mark[];
	backgroundColor: string;
	onCapture: (dataUrl: string | null) => void;
}) {
	const stageRef = useRef<Konva.Stage>(null);

	// `marks` isn't read in this closure, but a new marks array means the
	// Stage rendered different content and must be recaptured.
	// biome-ignore lint/correctness/useExhaustiveDependencies: see above
	useEffect(() => {
		// Let Konva finish its first draw before rasterizing.
		const id = requestAnimationFrame(() => {
			const stage = stageRef.current;
			if (!stage) {
				onCapture(null);
				return;
			}
			onCapture(captureBoardPNG(stage, backgroundColor));
		});
		return () => cancelAnimationFrame(id);
	}, [marks, backgroundColor, onCapture]);

	return (
		<div style={{ position: "fixed", left: -9999, top: 0 }} aria-hidden>
			<Stage ref={stageRef} width={800} height={800}>
				<Layer>
					{marks.map((m) => (
						<RenderMark key={m.id} mark={m} />
					))}
				</Layer>
			</Stage>
		</div>
	);
}
