import { type ReactNode, useEffect, useState } from "react";

/**
 * Renders its children only after mount, on the client. Konva / react-konva
 * touch the DOM canvas and cannot run during SSR, so the canvas tree must be
 * gated behind this. `children` is a render function so the (lazy) canvas import
 * is never evaluated on the server.
 */
export function ClientOnly({
	children,
	fallback = null,
}: {
	children: () => ReactNode;
	fallback?: ReactNode;
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return <>{mounted ? children() : fallback}</>;
}
