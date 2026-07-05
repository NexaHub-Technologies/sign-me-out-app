import { Link } from "@tanstack/react-router";

import { cn } from "#/lib/utils.ts";

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
			<img src="/logo.svg" alt="Sign Me Out logo" className="h-9 w-auto" />
			<span className="font-display text-lg font-bold tracking-tight text-ink">
				Sign Me <span className="text-marker-blue-deep">Out</span>
			</span>
		</Link>
	);
}
