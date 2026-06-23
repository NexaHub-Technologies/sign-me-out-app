import { Link } from "@tanstack/react-router";

import { cn } from "#/lib/utils.ts";

/** The Sign Me Out wordmark — a marker tick inside a paper badge, then the name. */
export function Logo({
	className,
	to = "/",
}: {
	className?: string;
	to?: string;
}) {
	return (
		<Link
			to={to}
			className={cn(
				"group inline-flex items-center gap-2.5 no-underline",
				className,
			)}
			aria-label="Sign Me Out — home"
		>
			<span className="relative grid size-9 place-items-center rounded-xl border border-line bg-surface-strong shadow-sm">
				<svg
					viewBox="0 0 32 32"
					className="size-5"
					fill="none"
					aria-hidden="true"
				>
					<title>Sign Me Out mark</title>
					<path
						d="M4 21c4-1 6-9 8-9s2 8 4 8 4-12 7-12"
						stroke="var(--marker-green-deep)"
						strokeWidth="2.6"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="transition-transform duration-300 group-hover:translate-x-0.5"
					/>
					<circle cx="25" cy="9" r="2" fill="var(--marker-pink)" />
				</svg>
			</span>
			<span className="font-display text-lg font-bold tracking-tight text-ink">
				Sign Me <span className="text-marker-green-deep">Out</span>
			</span>
		</Link>
	);
}
