import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Loader2,
	Lock,
	Mic,
	PenLine,
	Plus,
	QrCode,
	Sparkles,
	Trash2,
	Type,
	Users,
} from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ShareDialog } from "#/features/share/share-dialog.tsx";
import { boardColorById } from "#/lib/board-colors.ts";
import { cn } from "#/lib/utils.ts";
import { deleteSpace, listMySpaces } from "#/server/spaces.ts";

type DashboardSpace = ReturnType<typeof Route.useLoaderData>[number];

export const Route = createFileRoute("/_app/dashboard")({
	ssr: false,
	loader: async () => listMySpaces(),
	component: DashboardPage,
});

// Each board gets a tilt + marker accent, cycled by position, so the grid keeps
// the hand-marker feel without inventing placeholder text.
const ACCENTS = [
	"var(--marker-green-deep)",
	"var(--marker-pink)",
	"var(--marker-blue)",
	"var(--marker-amber)",
];
const ROTS = [-1.4, 1.3, -1.1, 1.2];

// The mini tool dock + marker colours, echoing the in-app canvas.
const DOCK_TOOLS = [
	{ id: "pen", icon: PenLine, active: true },
	{ id: "text", icon: Type, active: false },
	{ id: "voice", icon: Mic, active: false },
];
const DOCK_COLORS = [
	"var(--ink)",
	"var(--marker-green-deep)",
	"var(--marker-pink)",
	"var(--marker-blue)",
	"var(--marker-amber)",
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

/* a tiny live "signing now" pulse, lifted from the marketing hero board */
function LivePulse() {
	return (
		<span className="relative flex size-2.5">
			<span className="absolute inline-flex size-full animate-ping rounded-full bg-marker-blue opacity-70" />
			<span className="relative inline-flex size-2.5 rounded-full bg-marker-blue-deep" />
		</span>
	);
}

/* a scatter of marker sparkles drifting behind the header */
const headerConfetti = [
	{ cls: "left-[1%] top-[10%] text-marker-green", rot: -12, dur: 7, delay: 0 },
	{
		cls: "right-[24%] top-[2%] text-marker-pink",
		rot: 8,
		dur: 6,
		delay: 500,
	},
	{
		cls: "right-[2%] bottom-[8%] text-marker-amber",
		rot: -6,
		dur: 8,
		delay: 250,
	},
];

function HeaderConfetti() {
	return (
		<div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
			{headerConfetti.map((c) => (
				<Sparkles
					key={c.cls}
					className={cn("float absolute size-5 opacity-40", c.cls)}
					style={
						{
							"--rot": `${c.rot}deg`,
							"--dur": `${c.dur}s`,
							"--delay": `${c.delay}ms`,
						} as CSSProperties
					}
				/>
			))}
		</div>
	);
}

/* one space, framed as the same product-window board used on the landing page */
function SpaceCard({
	space,
	index,
	onRequestDelete,
	onRequestShare,
}: {
	space: DashboardSpace;
	index: number;
	onRequestDelete: (space: DashboardSpace) => void;
	onRequestShare: (space: DashboardSpace) => void;
}) {
	const board = boardColorById(space.boardColor);
	const darkBoard = board.dot.includes("255,255,255");
	const accent = ACCENTS[index % ACCENTS.length];
	const rot = ROTS[index % ROTS.length];
	const locked = space.status === "locked";
	// The space name reads as a marker scrawl on the board — white on dark boards.
	const nameColor = darkBoard ? "rgba(255,255,255,0.92)" : accent;

	return (
		<Link
			to="/s/$spaceId"
			params={{ spaceId: space.slug }}
			className="group block no-underline"
		>
			<article
				className="pin overflow-hidden rounded-2xl border border-line bg-card shadow-[0_24px_48px_-28px_rgba(27,27,25,0.35)] transition-shadow group-hover:shadow-[0_30px_60px_-26px_rgba(27,27,25,0.4)]"
				style={{ "--rot": `${rot}deg` } as CSSProperties}
			>
				{/* window chrome — status dot + delete + open affordance */}
				<div className="flex items-center justify-between gap-2 border-b border-line bg-paper/70 px-4 py-2.5">
					{locked ? (
						<Lock className="size-3.5 text-ink-faint" />
					) : (
						<LivePulse />
					)}
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={(e) => {
								// The whole card is a <Link>; keep the click from navigating.
								e.preventDefault();
								e.stopPropagation();
								onRequestShare(space);
							}}
							className="grid size-7 place-items-center rounded-lg text-ink-faint transition-all hover:bg-marker-blue-deep/10 hover:text-marker-blue-deep sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
							title="Share space"
							aria-label={`Share ${space.title}`}
						>
							<QrCode className="size-4" />
						</button>
						<button
							type="button"
							onClick={(e) => {
								// The whole card is a <Link>; keep the click from navigating.
								e.preventDefault();
								e.stopPropagation();
								onRequestDelete(space);
							}}
							// Always visible on touch (no hover); hover/focus-reveal from sm up.
							className="grid size-7 place-items-center rounded-lg text-ink-faint opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
							title="Delete space"
							aria-label={`Delete ${space.title}`}
						>
							<Trash2 className="size-4" />
						</button>
						<ArrowUpRight className="size-5 text-ink-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-marker-blue-deep" />
					</div>
				</div>

				{/* canvas preview — real board colour + sketch-grid dots; the space
				    name is hand-written on the board like a real scrawl */}
				<div
					className="relative h-40"
					style={{
						backgroundColor: board.bg,
						backgroundImage: `radial-gradient(${board.dot} 1px, transparent 1.4px)`,
						backgroundSize: "20px 20px",
					}}
				>
					{/* a marker swoosh that sits behind the name */}
					<svg
						className="pointer-events-none absolute inset-0 size-full"
						viewBox="0 0 300 160"
						fill="none"
						aria-hidden="true"
						preserveAspectRatio="none"
					>
						<path
							d="M30 110c40 18 75-40 115-32s45 54 100 20"
							stroke={accent}
							strokeWidth="4"
							strokeLinecap="round"
							opacity={darkBoard ? 0.5 : 0.35}
						/>
					</svg>

					<span
						className="scrawl absolute left-4 right-4 top-5 line-clamp-2 text-3xl leading-tight"
						style={{ color: nameColor, transform: "rotate(-3deg)" }}
					>
						{space.title}
					</span>

					{/* stat chips read on any board colour */}
					<div className="absolute bottom-3 left-4 flex items-center gap-2">
						<span className="inline-flex items-center gap-1.5 rounded-full bg-paper/85 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm backdrop-blur">
							<PenLine className="size-3.5 text-marker-blue-deep" />
							{space.marks}
						</span>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-paper/85 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm backdrop-blur">
							<Users className="size-3.5 text-marker-blue" />
							{space.contributors}
						</span>
					</div>
				</div>

				{/* tool dock — the same shape as the canvas dock */}
				<div className="flex items-center gap-1.5 border-t border-line bg-paper/70 px-4 py-2.5">
					{DOCK_TOOLS.map((t) => (
						<span
							key={t.id}
							className={cn(
								"grid size-7 place-items-center rounded-lg",
								t.active ? "bg-marker-blue-deep text-white" : "text-ink-faint",
							)}
						>
							<t.icon className="size-3.5" />
						</span>
					))}
					<span className="ml-auto flex items-center gap-1.5">
						{DOCK_COLORS.map((c) => (
							<span
								key={c}
								className="size-3 rounded-full border border-white shadow-sm"
								style={{ backgroundColor: c }}
							/>
						))}
					</span>
				</div>

				<p className="border-t border-line bg-card px-4 py-2 text-xs text-ink-faint">
					Updated {timeAgo(space.updatedAt)}
				</p>
			</article>
		</Link>
	);
}

/* the "open a new space" tile — a blank board waiting to be signed */
function NewSpaceCard() {
	return (
		<Link to="/create" className="group block no-underline">
			<article className="pin flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-card/40 transition-colors group-hover:border-marker-blue group-hover:bg-marker-blue-deep/[0.04]">
				<div className="flex items-center gap-2.5 border-b border-dashed border-line-strong px-4 py-2.5">
					<span className="size-2.5 rounded-full bg-line-strong" />
					<span className="font-display text-sm font-bold text-ink-soft">
						New board
					</span>
				</div>
				<div
					className="grid flex-1 place-items-center px-6 text-center"
					style={{
						backgroundImage:
							"radial-gradient(var(--line) 1px, transparent 1.4px)",
						backgroundSize: "20px 20px",
					}}
				>
					<div>
						<span className="pop mx-auto grid size-14 place-items-center rounded-full bg-marker-blue-deep text-white shadow-md transition-transform group-hover:rotate-90">
							<Plus className="size-7" />
						</span>
						<p className="font-display mt-3 text-lg font-bold text-ink">
							Open a new space
						</p>
						<p className="mt-1 text-sm text-ink-soft">
							Name it, then share one link
						</p>
					</div>
				</div>
			</article>
		</Link>
	);
}

/* shown when the user has no spaces yet — a single inviting blank board */
function EmptyState() {
	return (
		<div className="mt-12 grid place-items-center">
			<div
				className="pin relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_60px_-30px_rgba(27,27,25,0.4)]"
				style={{ "--rot": "-1.2deg" } as CSSProperties}
			>
				<div className="flex items-center gap-2.5 border-b border-line bg-paper/70 px-4 py-2.5">
					<LivePulse />
					<span className="font-display text-sm font-bold text-ink">
						Your first board
					</span>
				</div>
				<div
					className="relative grid h-64 place-items-center px-6 text-center"
					style={{
						backgroundColor: "var(--paper)",
						backgroundImage:
							"radial-gradient(var(--line) 1px, transparent 1.4px)",
						backgroundSize: "22px 22px",
					}}
				>
					<span className="scrawl absolute left-6 top-6 rotate-[-8deg] text-2xl text-marker-pink">
						sign right here ✍️
					</span>
					<span className="scrawl absolute bottom-6 right-8 rotate-6 text-xl text-marker-blue/70">
						— the whole squad
					</span>
					<div>
						<h2 className="font-display text-2xl font-extrabold text-ink">
							No boards yet
						</h2>
						<p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-soft">
							Open your sign-out space, share the link, and watch the
							signatures, doodles and voice notes roll in.
						</p>
						<Button asChild size="lg" className="pop mt-6 rounded-full">
							<Link to="/create">
								<Plus className="size-4" /> Open your space
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

/* confirmation before a permanent delete — the space name and mark count spelled
   out so nobody nukes the wrong board */
function DeleteSpaceDialog({
	space,
	busy,
	error,
	onCancel,
	onConfirm,
}: {
	space: DashboardSpace;
	busy: boolean;
	error: string | null;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	// Close on Escape (unless a delete is in flight).
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !busy) onCancel();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [busy, onCancel]);

	return (
		<div className="fixed inset-0 z-50 grid place-items-center p-4">
			{/* click-outside-to-close backdrop; Escape does the same via the effect */}
			<button
				type="button"
				aria-label="Close"
				className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-sm"
				onClick={() => !busy && onCancel()}
			/>
			<div
				className="pin relative w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-[0_30px_60px_-24px_rgba(27,27,25,0.5)]"
				style={{ "--rot": "-0.5deg" } as CSSProperties}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="delete-space-title"
			>
				<div className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
					<Trash2 className="size-5" />
				</div>
				<h2
					id="delete-space-title"
					className="font-display mt-4 text-xl font-extrabold text-ink"
				>
					Delete this space?
				</h2>
				<p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
					<span className="font-semibold text-ink">“{space.title}”</span> and
					all <span className="font-semibold text-ink">{space.marks}</span>{" "}
					{space.marks === 1 ? "mark" : "marks"} on it — signatures, doodles and
					voice notes — will be gone for good. This can’t be undone.
				</p>

				{error && (
					<p className="mt-4 text-sm font-medium text-destructive">{error}</p>
				)}

				<div className="mt-6 flex justify-end gap-3">
					<Button
						variant="outline"
						className="rounded-full"
						onClick={onCancel}
						disabled={busy}
					>
						Keep it
					</Button>
					<Button
						variant="destructive"
						className="rounded-full"
						onClick={onConfirm}
						disabled={busy}
					>
						{busy ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<>
								<Trash2 className="size-4" /> Delete forever
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

function DashboardPage() {
	const spaces = Route.useLoaderData();
	const router = useRouter();
	const totalMarks = spaces.reduce((n, s) => n + s.marks, 0);

	const [confirming, setConfirming] = useState<DashboardSpace | null>(null);
	const [sharing, setSharing] = useState<DashboardSpace | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function doDelete() {
		if (!confirming) return;
		setBusy(true);
		setError(null);
		try {
			await deleteSpace({ data: { slug: confirming.slug } });
			setConfirming(null);
			await router.invalidate();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Could not delete the space",
			);
		} finally {
			setBusy(false);
		}
	}

	function requestDelete(space: DashboardSpace) {
		setError(null);
		setConfirming(space);
	}

	return (
		<div className="page-wrap py-12">
			<header className="relative">
				<HeaderConfetti />
				<div className="flex flex-wrap items-end justify-between gap-5">
					<div className="rise-in">
						<Badge
							variant="outline"
							className="gap-1.5 rounded-full border-line bg-card px-3 py-1 text-marker-blue-deep"
						>
							<Sparkles className="size-3.5" /> Welcome back
						</Badge>
						<h1 className="font-display mt-4 text-3xl font-extrabold text-ink sm:text-[2.6rem]">
							Your sign-out{" "}
							<span
								className="hl"
								style={{ "--hl": "var(--marker-blue)" } as CSSProperties}
							>
								spaces
							</span>
						</h1>
						{spaces.length > 0 && (
							<p className="mt-3 text-[15px] text-ink-soft">
								<span className="font-semibold text-ink">{totalMarks}</span>{" "}
								{totalMarks === 1 ? "mark" : "marks"} left across{" "}
								<span className="font-semibold text-ink">{spaces.length}</span>{" "}
								{spaces.length === 1 ? "board" : "boards"}.
							</p>
						)}
					</div>

					{spaces.length > 0 && (
						<div className="relative">
							<Button asChild className="pop rounded-full">
								<Link to="/create">
									<Plus className="size-4" /> New space
								</Link>
							</Button>
							<span className="scrawl absolute -right-20 -top-6 hidden rotate-[-8deg] text-lg text-marker-pink lg:block">
								one link, that's it!
							</span>
						</div>
					)}
				</div>
			</header>

			{spaces.length === 0 ? (
				<EmptyState />
			) : (
				<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{spaces.map((s, i) => (
						<SpaceCard
							key={s.id}
							space={s}
							index={i}
							onRequestDelete={requestDelete}
							onRequestShare={setSharing}
						/>
					))}
					<NewSpaceCard />
				</div>
			)}

			{confirming && (
				<DeleteSpaceDialog
					space={confirming}
					busy={busy}
					error={error}
					onCancel={() => setConfirming(null)}
					onConfirm={doDelete}
				/>
			)}

			{sharing && (
				<ShareDialog
					slug={sharing.slug}
					title={sharing.title}
					boardColor={sharing.boardColor}
					onClose={() => setSharing(null)}
				/>
			)}
		</div>
	);
}
