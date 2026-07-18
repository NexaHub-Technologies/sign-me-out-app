import { type RefObject, useEffect, useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";
import { CanvasTexture, TextureLoader } from "three";

/**
 * Loads `imageUrl` (a data URL from the board capture, or a regular URL) onto
 * `meshRef`'s material as a texture map. Data URLs are drawn onto an
 * offscreen canvas first (letting us pad to a square with `background` before
 * the design, matching how a real print area would be prepped) — regular
 * URLs load straight through three's TextureLoader. Ported from the
 * duplicated per-product logic in the original mockup prototype.
 */
export function useMeshTexture(
	meshRef: RefObject<Mesh | null>,
	imageUrl: string | null,
	{ size, background }: { size: number; background: string },
) {
	const loaderRef = useRef(new TextureLoader());

	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh || !imageUrl) return;
		let cancelled = false;

		function applyTexture(
			texture: CanvasTexture | ReturnType<TextureLoader["load"]>,
		) {
			if (cancelled || !mesh) return;
			const material = mesh.material as MeshStandardMaterial;
			material.map = texture as never;
			material.needsUpdate = true;
		}

		if (imageUrl.startsWith("data:")) {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext("2d");
				if (!ctx) return;
				ctx.fillStyle = background;
				ctx.fillRect(0, 0, size, size);
				ctx.drawImage(img, 0, 0, size, size);
				applyTexture(new CanvasTexture(canvas));
			};
			img.src = imageUrl;
		} else {
			loaderRef.current.loadAsync(imageUrl).then(applyTexture);
		}

		return () => {
			cancelled = true;
		};
	}, [meshRef, imageUrl, size, background]);
}
