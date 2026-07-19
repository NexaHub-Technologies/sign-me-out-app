import { useGLTF } from "@react-three/drei";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
import { useGltfDesignTexture } from "#/features/mockup-3d/use-gltf-design-texture.ts";

const MODEL_URL = "/models/tote.glb";

// "Tui.002" is the bag body (the optimize pipeline merged the sourced
// front-face material into it) — the board design prints there. "Chi.002"
// is the handles/straps, tinted to match but not textured.
const BAG_MATERIALS = ["Tui.002"];
const ALL_MATERIALS = ["Chi.002", ...BAG_MATERIALS];

// See tshirt-mockup.tsx for why this recentring/scale exists. This source
// model's own units run much larger than the others (raw height ~7.5 vs
// ~0.7-0.9) — world bbox centre per `gltf-transform inspect` is
// ~(-0.002, 3.762, 0.127).
const CENTER: [number, number, number] = [0.0024, -3.7619, -0.1268];
const SCALE = 0.37;

export function ToteMockup({ imageUrl, color }: MockupProps) {
	// meshopt-compressed — see tshirt-mockup.tsx for why useDraco is off.
	const { scene, materials } = useGLTF(MODEL_URL, false);
	useGltfDesignTexture(materials, {
		textureNames: BAG_MATERIALS,
		tintNames: ALL_MATERIALS,
		imageUrl,
		size: 1024,
		background: "#f4ecd8",
		color,
	});

	return (
		<group scale={SCALE}>
			<primitive object={scene} position={CENTER} />
		</group>
	);
}

useGLTF.preload(MODEL_URL, false);
