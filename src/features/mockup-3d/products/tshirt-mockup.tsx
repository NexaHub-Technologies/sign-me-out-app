import { useGLTF } from "@react-three/drei";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
import { useGltfDesignTexture } from "#/features/mockup-3d/use-gltf-design-texture.ts";

const MODEL_URL = "/models/tshirt.glb";

// The single material shared by every mesh in this scan — gets both the
// board texture and the garment colour tint.
const MATERIALS = ["Material.001"];

// The meshopt/quantize compression step bakes its own correcting
// rotation+scale into the glb's root node (standard practice — it's what
// makes `<primitive object={scene}>` come out at the right *orientation*),
// but the mesh's own authored position still sits well off-origin (world
// bbox centre ~(0.006, 1.275, -0.003) per `gltf-transform inspect`) — real
// real-world-metre size too (~0.7 units tall), so still needs recentring
// (applied on the primitive, *inside* the scaled group so the offset isn't
// itself scaled) plus a scale-up to fill the frame.
const CENTER: [number, number, number] = [-0.006, -1.2754, 0.0025];
const SCALE = 3.7;

export function TshirtMockup({ imageUrl, color }: MockupProps) {
	// The glb is meshopt-compressed (gltf-transform optimize --compress
	// meshopt) — drei's MeshoptDecoder is bundled and on by default, no
	// separate decoder to host (unlike Draco). useDraco explicitly off.
	const { scene, materials } = useGLTF(MODEL_URL, false);
	useGltfDesignTexture(materials, {
		textureNames: MATERIALS,
		tintNames: MATERIALS,
		imageUrl,
		size: 1024,
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
