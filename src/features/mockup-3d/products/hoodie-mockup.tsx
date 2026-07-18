import { useRef } from "react";
import type { Mesh } from "three";
import type { MockupProps } from "#/features/mockup-3d/types.ts";
import { useMeshTexture } from "#/features/mockup-3d/use-mesh-texture.ts";

const WIDTH = 2.4;
const HEIGHT = 3.2;
const DEPTH = 0.2;

export function HoodieMockup({ imageUrl, color }: MockupProps) {
	const meshRef = useRef<Mesh>(null);
	useMeshTexture(meshRef, imageUrl, { size: 1024, background: "#1a1a1a" });

	return (
		<group>
			<mesh ref={meshRef} position={[0, 0, 0.1]}>
				<boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.9} />
			</mesh>

			<mesh position={[-(WIDTH / 2 + 0.35), HEIGHT * 0.15, 0]}>
				<boxGeometry args={[0.7, HEIGHT * 0.65, DEPTH]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.9} />
			</mesh>
			<mesh position={[WIDTH / 2 + 0.35, HEIGHT * 0.15, 0]}>
				<boxGeometry args={[0.7, HEIGHT * 0.65, DEPTH]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.9} />
			</mesh>

			<mesh position={[0, HEIGHT * 0.48, 0.3]}>
				<sphereGeometry args={[0.5, 32, 32, 0, Math.PI]} />
				<meshStandardMaterial color={color} metalness={0} roughness={0.9} />
			</mesh>

			<mesh position={[0, HEIGHT * 0.35, 0.5]}>
				<cylinderGeometry args={[0.05, 0.05, 0.8, 16]} />
				<meshStandardMaterial color="#444444" metalness={0} roughness={0.8} />
			</mesh>
		</group>
	);
}
