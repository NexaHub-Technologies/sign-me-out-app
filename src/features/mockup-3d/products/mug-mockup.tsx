import { useGLTF } from "@react-three/drei";
import {
	DRACO_DECODER_PATH,
	type MockupProps,
} from "#/features/mockup-3d/types.ts";
import { useGltfDesignTexture } from "#/features/mockup-3d/use-gltf-design-texture.ts";

const MODEL_URL = "/models/mug.glb";

// The whole mug is a single mesh/material — the board design wraps around it.
const MATERIALS = ["Scene_-_Root"];

// Already Y-up — recentred and scaled to roughly match the old procedural
// mug's on-screen size.
const CENTER: [number, number, number] = [0, 0.237, 0.022];
const SCALE = 0.76;

export function MugMockup({ imageUrl, color }: MockupProps) {
	const { scene, materials } = useGLTF(MODEL_URL, DRACO_DECODER_PATH);
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

useGLTF.preload(MODEL_URL, DRACO_DECODER_PATH);
