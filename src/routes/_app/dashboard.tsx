import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, PenLine, Plus, Users } from "lucide-react";

import { Button } from "#/components/ui/button.tsx";
import { Card } from "#/components/ui/card.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardPage,
});

// Sample spaces — replace with the signed-in user's spaces from the DB.
const spaces = [
	{
		id: "demo",
		title: "CSC Class of 2026",
		signatures: 248,
		contributors: 96,
		accent: "from-marker-green/30 to-marker-blue/15",
		updated: "2 hours ago",
	},
	{
		id: "lawschool26",
		title: "Law School Sign-Out",
		signatures: 132,
		contributors: 54,
		accent: "from-marker-pink/30 to-marker-amber/15",
		updated: "yesterday",
	},
];

function DashboardPage() {
	return (
		<div className="page-wrap py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="kicker">Welcome back</p>
					<h1 className="font-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
						Your sign-out spaces
					</h1>
				</div>
				<Button asChild className="rounded-full">
					<Link to="/create">
						<Plus className="size-4" /> New space
					</Link>
				</Button>
			</div>

			<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{spaces.map((s) => (
					<Link
						key={s.id}
						to="/s/$spaceId"
						params={{ spaceId: s.id }}
						className="group block no-underline"
					>
						<Card className="feature-card overflow-hidden border-0 p-0 shadow-none">
							<div className={cn("relative h-36 bg-gradient-to-br", s.accent)}>
								<span className="scrawl absolute left-4 top-4 rotate-[-6deg] text-2xl text-ink/45">
									we made it 🎓
								</span>
								<span className="scrawl absolute right-4 bottom-3 rotate-3 text-xl text-ink/35">
									— the squad
								</span>
							</div>
							<div className="p-5">
								<div className="flex items-start justify-between">
									<h2 className="font-display text-lg font-bold text-ink">
										{s.title}
									</h2>
									<ArrowUpRight className="size-5 text-ink-faint transition-colors group-hover:text-marker-green-deep" />
								</div>
								<div className="mt-3 flex items-center gap-4 text-sm text-ink-soft">
									<span className="inline-flex items-center gap-1.5">
										<PenLine className="size-4" /> {s.signatures} signatures
									</span>
									<span className="inline-flex items-center gap-1.5">
										<Users className="size-4" /> {s.contributors}
									</span>
								</div>
								<p className="mt-2 text-xs text-ink-faint">
									Updated {s.updated}
								</p>
							</div>
						</Card>
					</Link>
				))}

				<Link
					to="/create"
					className="grid min-h-[232px] place-items-center rounded-xl border border-dashed border-line-strong bg-card/40 text-center no-underline transition-colors hover:border-marker-green hover:bg-marker-green-deep/[0.04]"
				>
					<div>
						<span className="mx-auto grid size-12 place-items-center rounded-full bg-marker-green-deep text-white">
							<Plus className="size-6" />
						</span>
						<p className="font-display mt-3 font-bold text-ink">
							Open a new space
						</p>
						<p className="mt-1 text-sm text-ink-soft">
							Start collecting signatures
						</p>
					</div>
				</Link>
			</div>
		</div>
	);
}
