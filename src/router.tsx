import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		// Preloaded data stays usable for 30s (TanStack's own default). At 0 every
		// hover-preload was discarded as stale the moment the link was clicked, so
		// the preload did the work twice and the navigation still waited for it.
		// Safe here because mutations call router.invalidate() explicitly, and the
		// board page corrects itself over Realtime as soon as it mounts.
		defaultPreloadStaleTime: 30_000,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
