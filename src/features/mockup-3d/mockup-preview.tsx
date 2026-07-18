import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Loader2 } from "lucide-react";

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
			<Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
				<MockupScene
					productId={productId as MockupProductId}
					imageUrl={dataUrl}
					color={color}
				/>
				<OrbitControls enableZoom={false} />
			</Canvas>
			{(loading || !dataUrl) && !error && (
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
