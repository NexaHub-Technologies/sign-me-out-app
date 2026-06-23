import { Link } from "@tanstack/react-router";

import { Logo } from "#/components/logo.tsx";

const columns = [
	{
		title: "The space",
		links: [
			{ to: "/how-it-works", label: "How it works" },
			{ to: "/create", label: "Open your space" },
			{ to: "/dashboard", label: "Your spaces" },
		],
	},
	{
		title: "Keep it",
		links: [
			{ to: "/wear", label: "Wear your sign-out" },
			{ to: "/wear", label: "Print & PDF" },
			{ to: "/dashboard", label: "Your spaces" },
		],
	},
	{
		title: "Sign Me Out",
		links: [
			{ to: "/login", label: "Log in" },
			{ to: "/signup", label: "Sign up" },
		],
	},
] as const;

export function SiteFooter() {
	return (
		<footer className="site-footer mt-24">
			<div className="page-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
				<div className="max-w-xs">
					<Logo />
					<p className="mt-4 text-sm leading-relaxed text-ink-soft">
						The last paper is done. Open a canvas, share one link, and let
						everyone sign you out.
					</p>
					<p className="scrawl mt-5 text-2xl text-marker-green-deep">
						we made it 🎓
					</p>
				</div>

				{columns.map((col) => (
					<div key={col.title}>
						<p className="kicker">{col.title}</p>
						<ul className="mt-4 flex flex-col gap-2.5">
							{col.links.map((link) => (
								<li key={link.label}>
									<Link
										to={link.to}
										className="text-sm font-medium text-ink-soft no-underline hover:text-ink"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>

			<div className="page-wrap flex flex-col items-center justify-between gap-3 border-t border-line py-6 text-sm text-ink-faint sm:flex-row">
				<p>
					© {new Date().getFullYear()} Sign Me Out. Made for the class that made
					it.
				</p>
				<p>Lagos · Nigeria</p>
			</div>
		</footer>
	);
}
