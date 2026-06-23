import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Logo } from "#/components/logo.tsx";
import { Avatar, AvatarFallback } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

function AppLayout() {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
				<div className="page-wrap flex h-16 items-center justify-between">
					<div className="flex items-center gap-8">
						<Logo to="/dashboard" />
						<nav className="hidden items-center gap-6 sm:flex">
							<Link
								to="/dashboard"
								className="nav-link text-sm"
								activeProps={{ className: "is-active" }}
							>
								Your spaces
							</Link>
							<Link
								to="/wear"
								className="nav-link text-sm"
								activeProps={{ className: "is-active" }}
							>
								Wear
							</Link>
						</nav>
					</div>

					<div className="flex items-center gap-3">
						<Button asChild size="sm" className="rounded-full">
							<Link to="/create">
								<Plus className="size-4" /> New space
							</Link>
						</Button>
						<Avatar className="size-9">
							<AvatarFallback className="bg-marker-green-deep font-display text-sm font-bold text-white">
								A
							</AvatarFallback>
						</Avatar>
					</div>
				</div>
			</header>

			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}
