import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock, PenLine, Plus, Users } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Card } from "#/components/ui/card.tsx";
import { cn } from "#/lib/utils.ts";
import { listMySpaces } from "#/server/spaces.ts";

export const Route = createFileRoute("/_app/dashboard")({
	ssr: false,
	loader: async () => listMySpaces(),
	component: DashboardPage,
});

// A few board accents to give the cards visual variety, cycled by position.
const ACCENTS = [
	"from-marker-green/35 to-marker-blue/20",
	"from-marker-pink/35 to-marker-amber/20",
	"from-marker-blue/35 to-marker-green/20",
	"from-marker-amber/35 to-marker-pink/20",
];

// Each board gets its own little scrawl pair and tilt, cycled by position.
const BOARD_DOODLES = [
	{ top: "we made it 🎓", bottom: "— the squad", rot: -1.6 },
	{ top: "final year baddie ✨", bottom: "love, everyone", rot: 1.6 },
	{ top: "to the moon 🚀", bottom: "— your people", rot: -1.2 },
	{ top: "no more night class 🙏", bottom: "best of luck", rot: 1.2 },
];

function timeAgo(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.round(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.round(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.round(hrs / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString();
}

function DashboardPage() {
	const spaces = Route.useLoaderData();
	const totalMarks = spaces.reduce((n, s) => n + s.marks, 0);

	return (
		<div className="page-wrap py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="relative">
					<p className="kicker">Welcome back</p>
					<h1 className="font-display mt-2 text-3xl font-extrabold text-ink sm:text-[2.6rem]">
						Your sign-out{" "}
						<span
							className="hl"
							style={{ "--hl": "var(--marker-green)" } as CSSProperties}
						>
							spaces
						</span>
					</h1>
					{spaces.length > 0 && (
						<p className="mt-2 text-[15px] text-ink-soft">
							<span className="font-semibold text-ink">{totalMarks}</span>{" "}
							{totalMarks === 1 ? "mark" : "marks"} left across {spaces.length}{" "}
							{spaces.length === 1 ? "board" : "boards"}.
						</p>
					)}
				</div>
				<Button asChild className="pop rounded-full">
					<Link to="/create">
						<Plus className="size-4" /> New space
					</Link>
				</Button>
			</div>

			{spaces.length === 0 && (
				<p className="mt-6 text-[15px] text-ink-soft">
					You haven't opened a space yet. Create one and share the link to start
					collecting signatures.
				</p>
			)}

			<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{spaces.map((s, i) => {
					const doodle = BOARD_DOODLES[i % BOARD_DOODLES.length];
					return (
						<Link
							key={s.id}
							to="/s/$spaceId"
							params={{ spaceId: s.slug }}
							className="group block no-underline"
						>
							<Card
								className="feature-card pin overflow-hidden border-0 p-0 shadow-none"
								style={{ "--rot": `${doodle.rot}deg` } as CSSProperties}
							>
								<div
									className={cn(
										"relative h-36 bg-gradient-to-br",
										ACCENTS[i % ACCENTS.length],
									)}
								>
									{/* dot grid so the card header reads as a real canvas */}
									<div
										className="pointer-events-none absolute inset-0 opacity-50"
										style={{
											backgroundImage:
												"radial-gradient(var(--line) 1px, transparent 1.4px)",
											backgroundSize: "18px 18px",
										}}
									/>
									<span className="scrawl absolute left-4 top-4 rotate-[-6deg] text-2xl text-ink/55">
										{doodle.top}
									</span>
									<span className="scrawl absolute right-4 bottom-3 rotate-3 text-xl text-ink/40">
										{doodle.bottom}
									</span>
									{s.status === "locked" && (
										<span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-paper/85 px-2 py-1 text-xs font-medium text-ink-soft backdrop-blur">
											<Lock className="size-3" /> Locked
										</span>
									)}
								</div>
								<div className="p-5">
									<div className="flex items-start justify-between">
										<h2 className="font-display text-lg font-bold text-ink">
											{s.title}
										</h2>
										<ArrowUpRight className="size-5 text-ink-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-marker-green-deep" />
									</div>
									<div className="mt-3 flex items-center gap-4 text-sm text-ink-soft">
										<span className="inline-flex items-center gap-1.5">
											<PenLine className="size-4" /> {s.marks} signatures
										</span>
										<span className="inline-flex items-center gap-1.5">
											<Users className="size-4" /> {s.contributors}
										</span>
									</div>
									<p className="mt-2 text-xs text-ink-faint">
										Updated {timeAgo(s.updatedAt)}
									</p>
								</div>
							</Card>
						</Link>
					);
				})}

				<Link
					to="/create"
					className="group grid min-h-[232px] place-items-center rounded-xl border-2 border-dashed border-line-strong bg-card/40 text-center no-underline transition-colors hover:border-marker-green hover:bg-marker-green-deep/[0.05]"
				>
					<div>
						<span className="pop mx-auto grid size-14 place-items-center rounded-full bg-marker-green-deep text-white shadow-md transition-transform group-hover:rotate-90">
							<Plus className="size-7" />
						</span>
						<p className="font-display mt-3 text-lg font-bold text-ink">
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
