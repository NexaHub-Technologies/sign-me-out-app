import { OrbitControls, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

import { BoardTextureCapture } from "#/features/mockup-3d/board-texture-capture.tsx";
import { MockupScene } from "#/features/mockup-3d/mockup-scene.tsx";
import {
	hasMockup,
	type MockupProductId,
} from "#/features/mockup-3d/product-registry.ts";
import { useBoardTexture } from "#/features/mockup-3d/use-board-texture.ts";

/**
 * The 3D product preview shown on /customize. Returns null when the product
 * has no mockup geometry yet (see product-registry.ts) or no board is
 * selected — callers should fall back to the flat product photo in that case.
 */
export function MockupPreview({
	productId,
	boardSlug,
	color,
}: {
	productId: string;
	boardSlug: string | null;
	color: string;
}) {
	const { marks, dataUrl, backgroundColor, loading, error, onCapture } =
		useBoardTexture(boardSlug);
	// Tracks THREE.DefaultLoadingManager — true while the glb/textures for the
	// active product are still being fetched, independent of the board-texture
	// capture above. Combined below so the spinner covers both loading phases.
	const { active: modelLoading } = useProgress();

	if (!hasMockup(productId) || !boardSlug) return null;

	return (
		<div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-paper-2/70">
			{marks && (
				<BoardTextureCapture
					marks={marks}
					backgroundColor={backgroundColor}
					onCapture={onCapture}
				/>
			)}
			{/* Canvas's own wrapper div has no intrinsic size — inside a parent
			    sized only by CSS aspect-ratio (aspect-square, no explicit height),
			    its react-use-measure container ends up unmeasurable and R3F falls
			    back to the browser's default 300x150 canvas. Filling it explicitly
			    gives it the parent's real box to observe. */}
			<Canvas
				camera={{ position: [0, 0, 5], fov: 50 }}
				style={{
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
				}}
			>
				{/* <Canvas> runs its own React reconciler — a Suspense boundary
				    outside it (e.g. around the lazy-loaded MockupPreview import in
				    customize.tsx) does NOT catch a useGLTF() suspension from inside.
				    Without this, the model's own load never resolves visually and
				    the canvas just sits blank forever. */}
				<Suspense fallback={null}>
					<MockupScene
						productId={productId as MockupProductId}
						imageUrl={dataUrl}
						color={color}
					/>
				</Suspense>
				<OrbitControls enableZoom={false} />
			</Canvas>
			{(loading || !dataUrl || modelLoading) && !error && (
				<div className="pointer-events-none absolute inset-0 grid place-items-center bg-paper-2/60">
					<Loader2 className="size-6 animate-spin text-ink-faint" />
				</div>
			)}
			{error && (
				<div className="absolute inset-x-0 bottom-0 bg-paper-2/90 px-3 py-2 text-center text-xs text-destructive">
					{error}
				</div>
			)}
		</div>
	);
}
