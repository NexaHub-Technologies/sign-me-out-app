import { useRef } from "react";
import type { Mesh } from "three";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
import { useMeshTexture } from "#/features/mockup-3d/use-mesh-texture.ts";

/** Ported from the prototype's CupMockup — mapped to the catalogue's "mug" product. */
export function MugMockup({ imageUrl, color }: MockupProps) {
	const meshRef = useRef<Mesh>(null);
	useMeshTexture(meshRef, imageUrl, { size: 512, background: "#ffffff" });

	return (
		<group position={[0, -0.5, 0]}>
			<mesh ref={meshRef}>
				<cylinderGeometry args={[1, 0.95, 2, 64]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.7} />
			</mesh>

			<mesh position={[0, -1, 0]}>
				<cylinderGeometry args={[0.95, 0.9, 0.1, 64]} />
				<meshStandardMaterial color="#e0e0e0" metalness={0} roughness={0.7} />
			</mesh>

			<mesh position={[0, 1, 0]}>
				<torusGeometry args={[1, 0.08, 32, 100]} />
				<meshStandardMaterial color="#cccccc" metalness={0.2} roughness={0.6} />
			</mesh>

			<mesh position={[1.3, 0, 0]}>
				<torusGeometry args={[0.35, 0.1, 32, 100, 0, Math.PI]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.7} />
			</mesh>
		</group>
	);
}
