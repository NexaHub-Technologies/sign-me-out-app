import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Logo } from "#/components/logo.tsx";
import { Button } from "#/components/ui/button.tsx";

const nav = [
	{ to: "/how-it-works", label: "How it works" },
	{ to: "/wear", label: "Wear it" },
] as const;

export function SiteHeader() {
	const [open, setOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
			<div className="page-wrap flex h-16 items-center justify-between">
				<Logo />

				<nav className="hidden items-center gap-8 md:flex">
					{nav.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="nav-link text-sm"
							activeProps={{ className: "is-active" }}
						>
							{item.label}
						</Link>
					))}
					<Link
						to="/s/$spaceId"
						params={{ spaceId: "demo" }}
						className="nav-link text-sm"
						activeProps={{ className: "is-active" }}
					>
						See a space
					</Link>
				</nav>

				<div className="hidden items-center gap-2 md:flex">
					<Button asChild variant="ghost" size="sm" className="rounded-full">
						<Link to="/login">Log in</Link>
					</Button>
					<Button asChild size="sm" className="rounded-full">
						<Link to="/signup">Create your space</Link>
					</Button>
				</div>

				<button
					type="button"
					className="grid size-10 place-items-center rounded-xl border border-line bg-card text-ink md:hidden"
					onClick={() => setOpen((v) => !v)}
					aria-label={open ? "Close menu" : "Open menu"}
					aria-expanded={open}
				>
					{open ? <X className="size-5" /> : <Menu className="size-5" />}
				</button>
			</div>

			{open && (
				<div className="border-t border-line bg-paper md:hidden">
					<div className="page-wrap flex flex-col gap-1 py-4">
						{nav.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="rounded-lg px-3 py-2.5 font-semibold text-ink-soft hover:bg-ink/5"
								onClick={() => setOpen(false)}
							>
								{item.label}
							</Link>
						))}
						<Link
							to="/s/$spaceId"
							params={{ spaceId: "demo" }}
							className="rounded-lg px-3 py-2.5 font-semibold text-ink-soft hover:bg-ink/5"
							onClick={() => setOpen(false)}
						>
							See a space
						</Link>
						<div className="mt-2 flex flex-col gap-2">
							<Button
								asChild
								variant="outline"
								className="rounded-full"
								onClick={() => setOpen(false)}
							>
								<Link to="/login">Log in</Link>
							</Button>
							<Button
								asChild
								className="rounded-full"
								onClick={() => setOpen(false)}
							>
								<Link to="/signup">Create your space</Link>
							</Button>
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
