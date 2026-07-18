import { useGLTF } from "@react-three/drei";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
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

// See tshirt-mockup.tsx — the baked node transform fixes orientation/scale
// but not position; world bbox centre per `gltf-transform inspect` is
// ~(-0.004, 1.202, -0.017), still needs recentring plus a scale-up.
const CENTER: [number, number, number] = [0.0036, -1.2023, 0.0166];
const SCALE = 2.9;

export function HoodieMockup({ imageUrl, color }: MockupProps) {
	// meshopt-compressed — see tshirt-mockup.tsx for why useDraco is off.
	const { scene, materials } = useGLTF(MODEL_URL, false);
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

useGLTF.preload(MODEL_URL, false);
