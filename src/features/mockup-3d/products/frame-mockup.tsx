import { useRef } from "react";
import type { Mesh } from "three";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
import { useMeshTexture } from "#/features/mockup-3d/use-mesh-texture.ts";

/**
 * The frame's border is the "colour" — the print mat and glass stay neutral
 * regardless of which garment colour is selected, since a framed print isn't
 * fabric.
 */
export function FrameMockup({ imageUrl, color }: MockupProps) {
	const meshRef = useRef<Mesh>(null);
	useMeshTexture(meshRef, imageUrl, { size: 1024, background: "#fafafa" });

	return (
		<group>
			<mesh ref={meshRef} position={[0, 0, 0.05]}>
				<boxGeometry args={[2.8, 3.2, 0.05]} />
				<meshStandardMaterial color="#fafafa" metalness={0} roughness={0.8} />
			</mesh>

			<mesh position={[0, 1.75, 0]}>
				<boxGeometry args={[3, 0.3, 0.15]} />
				<meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
			</mesh>
			<mesh position={[0, -1.75, 0]}>
				<boxGeometry args={[3, 0.3, 0.15]} />
				<meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
			</mesh>
			<mesh position={[-1.5, 0, 0]}>
				<boxGeometry args={[0.3, 3.5, 0.15]} />
				<meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
			</mesh>
			<mesh position={[1.5, 0, 0]}>
				<boxGeometry args={[0.3, 3.5, 0.15]} />
				<meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
			</mesh>

			<mesh position={[0, 0, 0.06]}>
				<boxGeometry args={[2.6, 3, 0.02]} />
				<meshStandardMaterial color="#d9d9d9" metalness={0} roughness={0.9} />
			</mesh>

			<mesh position={[0, 0, 0.1]}>
				<boxGeometry args={[2.9, 3.3, 0.02]} />
				<meshStandardMaterial
					color="#ffffff"
					metalness={0.3}
					roughness={0.1}
					transparent
					opacity={0.15}
				/>
			</mesh>
		</group>
	);
}
