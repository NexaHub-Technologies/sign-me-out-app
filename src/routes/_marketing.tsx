import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SiteFooter } from "#/components/site-footer.tsx";
import { SiteHeader } from "#/components/site-header.tsx";

export const Route = createFileRoute("/_marketing")({
	component: MarketingLayout,
});

function MarketingLayout() {
	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader />
			<main className="flex-1">
				<Outlet />
			</main>
			<SiteFooter />
		</div>
	);
}
