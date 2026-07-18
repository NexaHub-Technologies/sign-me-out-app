import { useGLTF } from "@react-three/drei";
import {
	DRACO_DECODER_PATH,
	type MockupProps,
} from "#/features/mockup-3d/types.ts";
import { useGltfDesignTexture } from "#/features/mockup-3d/use-gltf-design-texture.ts";

const MODEL_URL = "/models/hoodie.glb";

// Front-facing fabric panels — where the board design prints.
const FRONT_MATERIALS = [
	"Force_Fleece_FRONT_134561",
	"Fabric374733_FRONT_76578_0",
	"Fabric374733_FRONT_76578",
];
// Every cloth material (front, side, ribbing) — tinted to the garment colour.
// The remaining materials (Material94281/83/85/87) are the drawstring
// aglets/zipper hardware and are left with their authored metal/plastic look.
const CLOTH_MATERIALS = [
	...FRONT_MATERIALS,
	"2x2_Rib_FRONT_134483",
	"Fabric374733_SIDE_76578_0",
	"Fabric374733_SIDE_76578",
];

// Already Y-up (tallest axis is Y in the source scan) — just recentred and
// scaled to roughly match the old procedural garment's on-screen size.
const CENTER: [number, number, number] = [0.004, -0.951, 0.02];
const SCALE = 1.5;

export function HoodieMockup({ imageUrl, color }: MockupProps) {
	const { scene, materials } = useGLTF(MODEL_URL, DRACO_DECODER_PATH);
	useGltfDesignTexture(materials, {
		textureNames: FRONT_MATERIALS,
		tintNames: CLOTH_MATERIALS,
		imageUrl,
		size: 1024,
		background: "#1a1a1a",
		color,
	});

	return (
		<group scale={SCALE}>
			<primitive object={scene} position={CENTER} />
		</group>
	);
}

useGLTF.preload(MODEL_URL, DRACO_DECODER_PATH);
