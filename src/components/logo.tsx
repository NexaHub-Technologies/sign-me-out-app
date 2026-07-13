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
				"group inline-flex shrink-0 items-center gap-2 no-underline sm:gap-2.5",
				className,
			)}
			aria-label="Sign Me Out — home"
		>
			<img
				src="/logo.svg"
				alt="Sign Me Out logo"
				className="h-7 w-auto sm:h-9"
			/>
			<span className="whitespace-nowrap font-display text-base font-bold tracking-tight text-ink sm:text-lg">
				Sign Me <span className="text-marker-blue-deep">Out</span>
			</span>
		</Link>
	);
}
