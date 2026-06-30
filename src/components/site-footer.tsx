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
				<p className="flex items-center gap-2">
					<svg
						viewBox="2632 371 1260 1260"
						className="size-5"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M2632.489,371.6L3018.089,371.6L3018.089,471.6L2732.489,471.6L2732.489,950L2632.489,950L2632.489,371.6ZM3118.089,1528.4L3403.689,1528.4L3403.689,1628.4L3118.089,1628.4L3118.089,1528.4ZM3889.289,1624.8L3503.689,1624.8L3503.689,1524.8L3789.289,1524.8L3789.289,1046.4L3889.289,1046.4L3889.289,1624.8ZM2825.289,564.4L3696.489,564.4L3696.489,1435.6L2825.289,1435.6L2825.289,564.4ZM3889.289,375.2L3889.289,953.6L3789.289,953.6L3789.289,475.2L3503.689,475.2L3503.689,375.2L3889.289,375.2ZM3118.089,371.6L3403.689,371.6L3403.689,471.6L3118.089,471.6L3118.089,371.6ZM2732.489,1050L2732.489,1528.4L3018.089,1528.4L3018.089,1628.4L2632.489,1628.4L2632.489,1050L2732.489,1050Z"
							fill="currentColor"
						/>
					</svg>
					© {new Date().getFullYear()} Sign Me Out by NexaHub Technologies Ltd.
				</p>
				<p>Abuja· Nigeria</p>
			</div>
		</footer>
	);
}
