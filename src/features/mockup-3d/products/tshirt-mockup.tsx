import { useRef } from "react";
import type { Mesh } from "three";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
import { useMeshTexture } from "#/features/mockup-3d/use-mesh-texture.ts";

const WIDTH = 2.2;
const HEIGHT = 3;
const DEPTH = 0.2;

export function TshirtMockup({ imageUrl, color }: MockupProps) {
	const meshRef = useRef<Mesh>(null);
	useMeshTexture(meshRef, imageUrl, { size: 1024, background: "#ffffff" });

	return (
		<group>
			<mesh ref={meshRef} position={[0, 0, 0.1]}>
				<boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.8} />
			</mesh>

			<mesh position={[-(WIDTH / 2 + 0.3), HEIGHT * 0.15, 0]}>
				<boxGeometry args={[0.6, HEIGHT * 0.6, DEPTH]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.8} />
			</mesh>
			<mesh position={[WIDTH / 2 + 0.3, HEIGHT * 0.15, 0]}>
				<boxGeometry args={[0.6, HEIGHT * 0.6, DEPTH]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.8} />
			</mesh>

			<mesh position={[0, HEIGHT * 0.45, 0.15]}>
				<cylinderGeometry args={[0.4, 0.4, DEPTH, 32]} />
				<meshStandardMaterial color="#888888" metalness={0} roughness={0.8} />
			</mesh>
		</group>
	);
}
