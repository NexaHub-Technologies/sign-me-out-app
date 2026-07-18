import { useGLTF } from "@react-three/drei";
import {
	DRACO_DECODER_PATH,
	type MockupProps,
} from "#/features/mockup-3d/types.ts";
import { useGltfDesignTexture } from "#/features/mockup-3d/use-gltf-design-texture.ts";

const MODEL_URL = "/models/tshirt.glb";

// The single material shared by every mesh in this scan — gets both the
// board texture and the garment colour tint.
const MATERIALS = ["Material.001"];

// Sourced as a flat-lay scan: its tallest axis is Z (shoulder-to-hem), not Y.
// Rotating -90° about X stands it up (Z becomes the new vertical axis), then
// it's recentred and scaled to roughly match the old procedural garment size.
const ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
// Negated raw bbox centre (0.006, 0.002, 1.275) — applied as the primitive's
// own local position *before* the parent group's rotation, so the group's
// rotation carries this offset along with the geometry automatically.
const CENTER: [number, number, number] = [-0.006, -0.002, -1.275];
const SCALE = 4.2;

export function TshirtMockup({ imageUrl, color }: MockupProps) {
	const { scene, materials } = useGLTF(MODEL_URL, DRACO_DECODER_PATH);
	useGltfDesignTexture(materials, {
		textureNames: MATERIALS,
		tintNames: MATERIALS,
		imageUrl,
		size: 1024,
		background: "#ffffff",
		color,
	});

	return (
		<group rotation={ROTATION} scale={SCALE}>
			<primitive object={scene} position={CENTER} />
		</group>
	);
}

useGLTF.preload(MODEL_URL, DRACO_DECODER_PATH);
