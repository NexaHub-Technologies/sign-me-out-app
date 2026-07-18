import { useEffect, useRef } from "react";
import type { Material, MeshStandardMaterial } from "three";
import { CanvasTexture, Color, TextureLoader } from "three";

/**
 * Applies the board design + garment colour onto a loaded GLTF's named
 * materials. Unlike the procedural mockups (see use-mesh-texture.ts), a real
 * model can have several materials — `textureNames` gets the board image (the
 * actual print area, e.g. the front panel), `tintNames` gets the colour swatch
 * (typically every fabric material, so trims/hardware keep their authored
 * look). The two lists usually overlap but don't have to.
 */
export function useGltfDesignTexture(
	materials: Record<string, Material>,
	{
		textureNames,
		tintNames,
		imageUrl,
		size,
		background,
		color,
	}: {
		textureNames: readonly string[];
		tintNames: readonly string[];
		imageUrl: string | null;
		size: number;
		background: string;
		color: string;
	},
) {
	const loaderRef = useRef(new TextureLoader());

	useEffect(() => {
		const tintTargets = tintNames
			.map((n) => materials[n])
			.filter((m): m is MeshStandardMaterial => !!m);
		for (const m of tintTargets) {
			m.color = new Color(color);
			m.needsUpdate = true;
		}
	}, [materials, tintNames, color]);

	useEffect(() => {
		const textureTargets = textureNames
			.map((n) => materials[n])
			.filter((m): m is MeshStandardMaterial => !!m);
		if (textureTargets.length === 0 || !imageUrl) return;
		let cancelled = false;

		function apply(
			texture: CanvasTexture | Awaited<ReturnType<TextureLoader["loadAsync"]>>,
		) {
			if (cancelled) return;
			for (const m of textureTargets) {
				m.map = texture as never;
				m.needsUpdate = true;
			}
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
				apply(new CanvasTexture(canvas));
			};
			img.src = imageUrl;
		} else {
			loaderRef.current.loadAsync(imageUrl).then(apply);
		}

		return () => {
			cancelled = true;
		};
	}, [materials, textureNames, imageUrl, size, background]);
}
