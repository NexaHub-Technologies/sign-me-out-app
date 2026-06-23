import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Heart,
	ImageIcon,
	Mic,
	PenLine,
	Play,
	Shirt,
	Sparkles,
	Type,
} from "lucide-react";

import { Avatar, AvatarFallback } from "#/components/ui/avatar.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card } from "#/components/ui/card.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_marketing/")({
	component: LandingPage,
});

const signers = [
	{ initials: "AO", color: "var(--marker-green-deep)" },
	{ initials: "TC", color: "var(--marker-pink)" },
	{ initials: "KE", color: "var(--marker-blue)" },
	{ initials: "MN", color: "var(--marker-amber)" },
];

function SignerStack() {
	return (
		<div className="flex -space-x-2.5">
			{signers.map((s) => (
				<Avatar key={s.initials} className="size-8 border-2 border-paper">
					<AvatarFallback
						className="text-[11px] font-semibold text-white"
						style={{ backgroundColor: s.color }}
					>
						{s.initials}
					</AvatarFallback>
				</Avatar>
			))}
		</div>
	);
}

/* --- the hero board, framed as a product window so the marks read as in-app --- */
const boardScrawls = [
	{
		text: "We made it!! 🎓",
		color: "var(--marker-green-deep)",
		className: "left-[8%] top-[12%]",
		rot: -5,
		size: "text-2xl sm:text-3xl",
	},
	{
		text: "final year baddie ✨",
		color: "var(--marker-pink)",
		className: "right-[9%] top-[20%]",
		rot: 4,
		size: "text-xl sm:text-2xl",
	},
	{
		text: "best of luck out there",
		color: "var(--marker-blue)",
		className: "left-[12%] bottom-[26%]",
		rot: -2,
		size: "text-xl sm:text-2xl",
	},
	{
		text: "— Ada",
		color: "var(--ink)",
		className: "right-[14%] bottom-[20%]",
		rot: -7,
		size: "text-2xl sm:text-3xl",
	},
];

const dockTools = [
	{ icon: PenLine, label: "Pen", active: true },
	{ icon: Type, label: "Text" },
	{ icon: ImageIcon, label: "Photo" },
	{ icon: Mic, label: "Voice" },
];

function HeroBoard() {
	return (
		<div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_60px_-20px_rgba(27,27,25,0.25)]">
			{/* window chrome */}
			<div className="flex items-center justify-between border-b border-line bg-paper/70 px-4 py-3">
				<div className="flex items-center gap-2.5">
					<span className="flex size-2.5 items-center justify-center rounded-full bg-marker-green" />
					<span className="font-display text-sm font-bold text-ink">
						CSC Class of 2026
					</span>
				</div>
				<div className="flex items-center gap-3">
					<SignerStack />
					<span className="hidden text-xs font-medium text-ink-faint sm:inline">
						+92 signing
					</span>
				</div>
			</div>

			{/* canvas */}
			<div
				className="relative h-[300px] sm:h-[340px]"
				style={{
					backgroundImage:
						"radial-gradient(var(--line) 1px, transparent 1.4px)",
					backgroundSize: "22px 22px",
				}}
			>
				{boardScrawls.map((s) => (
					<span
						key={s.text}
						className={cn("scrawl absolute", s.size, s.className)}
						style={{ color: s.color, transform: `rotate(${s.rot}deg)` }}
					>
						{s.text}
					</span>
				))}

				{/* a small live cursor with a name tag — gives it life without clutter */}
				<div className="absolute left-[46%] top-[50%]">
					<svg
						viewBox="0 0 16 16"
						className="size-4 text-marker-pink drop-shadow"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M1 1l5.5 13 2-5.5 5.5-2z" />
					</svg>
					<span className="ml-2 rounded-full bg-marker-pink px-2 py-0.5 text-[11px] font-semibold text-white shadow">
						Tobi
					</span>
				</div>

				{/* a pinned photo */}
				<div className="absolute right-[8%] top-[52%] w-24 rotate-6 rounded-lg border border-line bg-white p-1.5 shadow-md">
					<div className="grid h-16 place-items-center rounded bg-gradient-to-br from-marker-amber/30 to-marker-pink/25">
						<Heart className="size-5 text-marker-pink/70" />
					</div>
				</div>
			</div>

			{/* tool dock */}
			<div className="flex items-center gap-1.5 border-t border-line bg-paper/70 px-4 py-2.5">
				{dockTools.map((t) => (
					<span
						key={t.label}
						className={cn(
							"grid size-8 place-items-center rounded-lg",
							t.active ? "bg-marker-green-deep text-white" : "text-ink-soft",
						)}
					>
						<t.icon className="size-4" />
					</span>
				))}
				<span className="ml-auto flex items-center gap-1.5">
					{[
						"var(--ink)",
						"var(--marker-green-deep)",
						"var(--marker-pink)",
						"var(--marker-blue)",
						"var(--marker-amber)",
					].map((c) => (
						<span
							key={c}
							className="size-3.5 rounded-full border border-white shadow-sm"
							style={{ backgroundColor: c }}
						/>
					))}
				</span>
			</div>
		</div>
	);
}

function Hero() {
	return (
		<section className="page-wrap grid items-center gap-12 pt-14 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
			<div className="rise-in">
				<Badge
					variant="outline"
					className="gap-1.5 rounded-full border-line bg-card px-3 py-1 text-marker-green-deep"
				>
					<Sparkles className="size-3.5" /> For the class that finally made it
				</Badge>
				<h1 className="font-display mt-5 text-[2.7rem] font-extrabold leading-[1.02] text-ink sm:text-6xl">
					Last paper, done.
					<br />
					Now get{" "}
					<span className="marker-underline text-marker-green-deep">
						signed out.
					</span>
				</h1>
				<p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
					Open a sign-out canvas, share one link, and let coursemates,
					classmates and loved ones leave signatures, doodles, photos and voice
					notes. Then print it, save a PDF, or wear it.
				</p>

				<div className="mt-8 flex flex-col gap-3 sm:flex-row">
					<Button asChild size="lg" className="rounded-full">
						<Link to="/signup">
							Create your space <ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button asChild size="lg" variant="outline" className="rounded-full">
						<Link to="/s/$spaceId" params={{ spaceId: "demo" }}>
							<Play className="size-4" /> See a live space
						</Link>
					</Button>
				</div>

				<div className="mt-8 flex items-center gap-3">
					<SignerStack />
					<p className="text-sm text-ink-soft">
						<span className="font-semibold text-ink">2,400+ signatures</span>{" "}
						left this season
					</p>
				</div>
			</div>

			<div className="lg:pl-4">
				<HeroBoard />
			</div>
		</section>
	);
}

/* --- what guests can leave --- */
const leaveTypes = [
	{
		icon: PenLine,
		title: "Signatures",
		body: "Smooth, pressure-sensitive pen strokes — your real signature, not a typed name.",
		color: "var(--marker-green-deep)",
	},
	{
		icon: Sparkles,
		title: "Doodles",
		body: "Hearts, caps, inside jokes. Draw anywhere on the canvas, in any marker colour.",
		color: "var(--marker-pink)",
	},
	{
		icon: Type,
		title: "Well-wishes",
		body: "A line, a paragraph, a blessing. Handwritten or typed — however they say it best.",
		color: "var(--marker-blue)",
	},
	{
		icon: ImageIcon,
		title: "Photos",
		body: "Pin the lecture-hall selfies and squad shots right onto the board.",
		color: "var(--marker-amber)",
	},
	{
		icon: Mic,
		title: "Voice notes",
		body: "Record a message they can play back forever. The ones that get you teary.",
		color: "var(--marker-green-deep)",
	},
];

function LeaveSection() {
	return (
		<section className="page-wrap py-20">
			<div className="max-w-2xl">
				<p className="kicker">One canvas, every kind of love</p>
				<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-4xl">
					Everything your people can leave
				</h2>
				<p className="mt-4 text-lg text-ink-soft">
					An infinite canvas built with real ink. Invite the whole squad —
					there's always room for one more signature.
				</p>
			</div>

			<div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{leaveTypes.map((t) => (
					<Card
						key={t.title}
						className="feature-card gap-3 border-0 p-6 shadow-none"
					>
						<span
							className="grid size-11 place-items-center rounded-xl"
							style={{
								backgroundColor: `color-mix(in oklab, ${t.color} 14%, white)`,
							}}
						>
							<t.icon className="size-5" style={{ color: t.color }} />
						</span>
						<h3 className="font-display text-xl font-bold text-ink">
							{t.title}
						</h3>
						<p className="text-[15px] leading-relaxed text-ink-soft">
							{t.body}
						</p>
					</Card>
				))}

				<Card className="feature-card justify-between gap-4 border-0 bg-marker-green-deep/[0.05] p-6 shadow-none">
					<div>
						<h3 className="font-display text-xl font-bold text-ink">
							Invite everyone
						</h3>
						<p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
							Share one link. No accounts needed to sign — just open and write.
						</p>
					</div>
					<Button asChild className="w-fit rounded-full">
						<Link to="/signup">
							Open your space <ArrowRight className="size-4" />
						</Link>
					</Button>
				</Card>
			</div>
		</section>
	);
}

/* --- how it works: a real 3-step sequence, so numbering earns its place --- */
const steps = [
	{
		n: "01",
		title: "Open your space",
		body: "Name your sign-out, pick a board colour, and you have an infinite canvas in seconds.",
	},
	{
		n: "02",
		title: "Share one link",
		body: "Drop it in the class group. Coursemates and loved ones sign from any phone — no app, no sign-up.",
	},
	{
		n: "03",
		title: "Keep it forever",
		body: "Download a PDF, post it to your story, or print it on a shirt you can actually wear.",
	},
];

function HowItWorks() {
	return (
		<section className="border-y border-line bg-paper-2/50 py-20">
			<div className="page-wrap">
				<p className="kicker">From last paper to keepsake</p>
				<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-4xl">
					Three steps. One unforgettable board.
				</h2>

				<div className="mt-12 grid gap-8 md:grid-cols-3">
					{steps.map((s) => (
						<div key={s.n} className="relative">
							<div className="flex items-center gap-3">
								<span className="font-display grid size-12 place-items-center rounded-2xl bg-card text-xl font-extrabold text-marker-green-deep shadow-sm">
									{s.n}
								</span>
							</div>
							<h3 className="font-display mt-4 text-xl font-bold text-ink">
								{s.title}
							</h3>
							<p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
								{s.body}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

/* --- wear it --- */
const garments = [
	{
		name: "Sign-out tee",
		price: "₦12,000",
		tag: "Bestseller",
		shirt: "var(--marker-green-deep)",
	},
	{
		name: "Heavy hoodie",
		price: "₦24,000",
		tag: "Warm",
		shirt: "var(--marker-pink)",
	},
	{
		name: "Crew sweatshirt",
		price: "₦18,000",
		tag: "Classic",
		shirt: "var(--marker-blue)",
	},
];

function TeeMock({ color }: { color: string }) {
	return (
		<svg viewBox="0 0 200 200" className="h-40 w-auto" aria-hidden="true">
			<title>garment</title>
			<path
				d="M64 36 40 50 26 86l22 12 8-14v82h88V84l8 14 22-12-14-36-24-14-10 6a26 16 0 0 1-52 0z"
				fill={color}
				opacity="0.92"
			/>
			{/* a little signed canvas printed on the chest */}
			<rect
				x="78"
				y="92"
				width="44"
				height="52"
				rx="4"
				fill="#fff"
				opacity="0.95"
			/>
			<path
				d="M84 104c6-2 8 8 12 6s4-10 8-10"
				stroke={color}
				strokeWidth="2.4"
				fill="none"
				strokeLinecap="round"
			/>
			<path
				d="M86 122h28M86 132h20"
				stroke={color}
				strokeWidth="2.4"
				strokeLinecap="round"
				opacity="0.6"
			/>
		</svg>
	);
}

function WearSection() {
	return (
		<section className="page-wrap py-20">
			<div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
				<div>
					<p className="kicker inline-flex items-center gap-2">
						<Shirt className="size-3.5" /> Wear your sign-out
					</p>
					<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-4xl">
						The signed shirt, made real.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-ink-soft">
						It started with markers on a white shirt. Bring the tradition full
						circle — print your finished canvas on fashionable wear you'll
						actually reach for, picked from our drop and delivered to you.
					</p>
					<Button
						asChild
						size="lg"
						className="mt-7 rounded-full bg-ink text-paper hover:bg-ink/90"
					>
						<Link to="/wear">
							Browse the wear <ArrowRight className="size-4" />
						</Link>
					</Button>
				</div>

				<div className="grid gap-5 sm:grid-cols-3">
					{garments.map((g) => (
						<Card
							key={g.name}
							className="feature-card overflow-hidden border-0 p-0 shadow-none"
						>
							<div className="relative grid place-items-center bg-paper-2/70 pt-6 pb-2">
								<Badge className="absolute left-3 top-3 rounded-full bg-ink text-[10px] uppercase tracking-wide text-paper">
									{g.tag}
								</Badge>
								<TeeMock color={g.shirt} />
							</div>
							<div className="flex items-center justify-between px-4 pb-4">
								<span className="font-display font-bold text-ink">
									{g.name}
								</span>
								<span className="text-sm font-semibold text-ink-soft">
									{g.price}
								</span>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

function ClosingBand() {
	return (
		<section className="page-wrap pb-12">
			<div className="paper-card relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-10">
				<span className="scrawl absolute left-[8%] top-8 hidden rotate-[-8deg] text-3xl text-marker-pink/60 sm:block">
					congrats grad!
				</span>
				<span className="scrawl absolute right-[10%] bottom-10 hidden rotate-6 text-3xl text-marker-blue/60 sm:block">
					class of '26
				</span>
				<h2 className="font-display mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-ink sm:text-5xl">
					Your sign-out only happens once. Make it count.
				</h2>
				<p className="mx-auto mt-4 max-w-lg text-lg text-ink-soft">
					Open your canvas today and let everyone leave their mark.
				</p>
				<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
					<Button asChild size="lg" className="rounded-full">
						<Link to="/signup">
							Create your space <ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button asChild size="lg" variant="ghost" className="rounded-full">
						<Link to="/how-it-works">
							<Check className="size-4" /> See how it works
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

function LandingPage() {
	return (
		<>
			<Hero />
			<LeaveSection />
			<HowItWorks />
			<WearSection />
			<ClosingBand />
		</>
	);
}
