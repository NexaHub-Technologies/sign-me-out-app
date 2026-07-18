import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import {
	MOCKUP_PRODUCTS,
	type MockupProductId,
} from "#/features/mockup-3d/product-registry.ts";

export function MockupScene({
	productId,
	imageUrl,
	color,
}: {
	productId: MockupProductId;
	imageUrl: string | null;
	color: string;
}) {
	const groupRef = useRef<Group>(null);
	const Product = MOCKUP_PRODUCTS[productId];

	useFrame(() => {
		if (groupRef.current) groupRef.current.rotation.y += 0.005;
	});

	return (
		<>
			<ambientLight intensity={0.7} />
			<directionalLight position={[10, 10, 10]} intensity={1} />
			<directionalLight position={[-10, -10, -10]} intensity={0.3} />
			<Environment preset="studio" />
			<group ref={groupRef}>
				<Product imageUrl={imageUrl} color={color} />
			</group>
		</>
	);
}
