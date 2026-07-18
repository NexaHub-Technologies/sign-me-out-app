import { useGLTF } from "@react-three/drei";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
import { useGltfDesignTexture } from "#/features/mockup-3d/use-gltf-design-texture.ts";

const MODEL_URL = "/models/mug.glb";

// The whole mug is a single mesh/material — the board design wraps around it.
const MATERIALS = ["Scene_-_Root"];

// See tshirt-mockup.tsx — world bbox centre per `gltf-transform inspect` is
// ~(0.352, 2.575, -0.026), still needs recentring. Its baked scale already
// puts the mug at a reasonable frame-filling size (~2.2 units tall).
const CENTER: [number, number, number] = [-0.3522, -2.5754, 0.026];
const SCALE = 1;

export function MugMockup({ imageUrl, color }: MockupProps) {
	// meshopt-compressed — see tshirt-mockup.tsx for why useDraco is off.
	const { scene, materials } = useGLTF(MODEL_URL, false);
	useGltfDesignTexture(materials, {
		textureNames: MATERIALS,
		tintNames: MATERIALS,
		imageUrl,
		size: 512,
		background: "#ffffff",
		color,
	});

	return (
		<group scale={SCALE}>
			<primitive object={scene} position={CENTER} />
		</group>
	);
}

useGLTF.preload(MODEL_URL, false);
