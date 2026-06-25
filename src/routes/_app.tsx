import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AccountMenu } from "#/components/account-menu.tsx";
import { Logo } from "#/components/logo.tsx";
import { Button } from "#/components/ui/button.tsx";
import { useSessionUser } from "#/features/auth/use-session-user.ts";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

function AppLayout() {
	const { user, ready } = useSessionUser();
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
							<Link
								to="/customize"
								className="nav-link text-sm"
								activeProps={{ className: "is-active" }}
							>
								Customise &amp; order
							</Link>
						</nav>
					</div>

					<div className="flex items-center gap-3">
						<Button asChild size="sm" className="rounded-full">
							<Link to="/create">
								<Plus className="size-4" /> New space
							</Link>
						</Button>
						{!ready ? (
							<span className="size-9 animate-pulse rounded-full bg-ink/5" />
						) : user ? (
							<AccountMenu user={user} />
						) : (
							<Button
								asChild
								size="sm"
								variant="outline"
								className="rounded-full"
							>
								<Link to="/login">Log in</Link>
							</Button>
						)}
					</div>
				</div>
			</header>

			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}
