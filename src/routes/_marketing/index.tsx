import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Mic,
	PenLine,
	Shirt,
	Sparkles,
	Type,
} from "lucide-react";
import type { CSSProperties } from "react";

import { Avatar, AvatarFallback } from "#/components/ui/avatar.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card } from "#/components/ui/card.tsx";
import { pageMeta } from "#/lib/seo.ts";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_marketing/")({
	head: () => ({
		meta: pageMeta({
			title: "Sign Me Out — your sign-out, signed by everyone",
			description:
				"Your sign-out only happens once. Open a sign-out canvas, share one link, and let coursemates, classmates and loved ones leave signatures, doodles, photos and voice notes.",
			path: "/",
		}),
	}),
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

/* a tiny live "signing now" pulse */
function LivePulse() {
	return (
		<span className="relative flex size-2.5">
			<span className="absolute inline-flex size-full animate-ping rounded-full bg-marker-pink opacity-70" />
			<span className="relative inline-flex size-2.5 rounded-full bg-marker-pink" />
		</span>
	);
}

/* --- the hero board, framed as a product window so the marks read as in-app --- */
const boardScrawls = [
	{
		text: "We made it!! 🎓",
		color: "var(--marker-green-deep)",
		className: "left-[6%] top-[10%]",
		rot: -5,
		size: "text-2xl sm:text-3xl",
		delay: 150,
	},
	{
		text: "final year baddie ✨",
		color: "var(--marker-pink)",
		className: "right-[7%] top-[16%]",
		rot: 4,
		size: "text-xl sm:text-2xl",
		delay: 400,
	},
	{
		text: "no more night class 🙏",
		color: "var(--marker-amber)",
		className: "left-[9%] top-[40%]",
		rot: -3,
		size: "text-lg sm:text-xl",
		delay: 900,
	},
	{
		text: "best of luck out there",
		color: "var(--marker-blue)",
		className: "left-[10%] bottom-[24%]",
		rot: -2,
		size: "text-xl sm:text-2xl",
		delay: 650,
	},
	{
		text: "— Ada 💚",
		color: "var(--ink)",
		className: "right-[16%] bottom-[16%]",
		rot: -7,
		size: "text-2xl sm:text-3xl",
		delay: 1100,
	},
];

const dockTools = [
	{ icon: PenLine, label: "Pen", active: true },
	{ icon: Type, label: "Text" },
	{ icon: Mic, label: "Voice" },
];

function VoiceChip() {
	return (
		<span
			className="land-in absolute left-[42%] top-[18%] inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 shadow-md"
			style={{ "--delay": "1300ms", "--rot": "3deg" } as CSSProperties}
		>
			<span className="grid size-6 place-items-center rounded-full bg-marker-blue text-white">
				<Mic className="size-3" />
			</span>
			<span className="flex items-end gap-[3px]">
				{["a8", "b14", "c6", "d16", "e10", "f13", "g5"].map((bar) => (
					<span
						key={bar}
						className="w-[3px] rounded-full bg-marker-blue/70"
						style={{ height: `${bar.slice(1)}px` }}
					/>
				))}
			</span>
			<span className="text-xs font-semibold text-ink-soft">0:14</span>
		</span>
	);
}

function HeroBoard() {
	return (
		<div
			className="pin relative"
			style={{ "--rot": "1.4deg" } as CSSProperties}
		>
			<div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_40px_80px_-28px_rgba(27,27,25,0.35)]">
				{/* window chrome */}
				<div className="flex items-center justify-between border-b border-line bg-paper/70 px-4 py-3">
					<div className="flex items-center gap-2.5">
						<LivePulse />
						<span className="font-display text-sm font-bold text-ink">
							CSC Class of 2026
						</span>
					</div>
					<div className="flex items-center gap-3">
						<SignerStack />
						<span className="hidden text-xs font-medium text-ink-faint sm:inline">
							+92 signing now
						</span>
					</div>
				</div>

				{/* canvas */}
				<div
					className="relative h-[320px] sm:h-[380px]"
					style={{
						backgroundImage:
							"radial-gradient(var(--line) 1px, transparent 1.4px)",
						backgroundSize: "22px 22px",
					}}
				>
					{/* a marker swoosh that draws itself on, behind the scrawls */}
					<svg
						className="pointer-events-none absolute inset-0 size-full"
						viewBox="0 0 600 380"
						fill="none"
						aria-hidden="true"
						preserveAspectRatio="none"
					>
						<path
							className="draw-on"
							style={{ "--len": "900", "--delay": "350ms" } as CSSProperties}
							d="M70 250c80 40 150-90 230-70s90 120 200 40"
							stroke="var(--marker-blue)"
							strokeWidth="5"
							strokeLinecap="round"
							opacity="0.45"
						/>
					</svg>

					{boardScrawls.map((s) => (
						<span
							key={s.text}
							className={cn("scrawl land-in absolute", s.size, s.className)}
							style={
								{
									color: s.color,
									"--rot": `${s.rot}deg`,
									"--delay": `${s.delay}ms`,
								} as CSSProperties
							}
						>
							{s.text}
						</span>
					))}

					<VoiceChip />

					{/* live cursors with name tags — gives it real-time life */}
					<div className="cursor-drift absolute left-[44%] top-[52%]">
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
					<div
						className="cursor-drift absolute left-[20%] top-[64%]"
						style={{ animationDelay: "1.5s", animationDuration: "11s" }}
					>
						<svg
							viewBox="0 0 16 16"
							className="size-4 text-marker-blue drop-shadow"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M1 1l5.5 13 2-5.5 5.5-2z" />
						</svg>
						<span className="ml-2 rounded-full bg-marker-blue px-2 py-0.5 text-[11px] font-semibold text-white shadow">
							Ngozi
						</span>
					</div>
				</div>

				{/* tool dock */}
				<div className="flex items-center gap-1.5 border-t border-line bg-paper/70 px-4 py-2.5">
					{dockTools.map((t) => (
						<span
							key={t.label}
							className={cn(
								"grid size-8 place-items-center rounded-lg transition-colors",
								t.active ? "bg-marker-blue-deep text-white" : "text-ink-soft",
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
		</div>
	);
}

/* a scatter of marker confetti drifting behind the hero */
const confetti = [
	{ cls: "left-[2%] top-[18%] text-marker-green", rot: -12, dur: 7, delay: 0 },
	{ cls: "left-[48%] top-[4%] text-marker-pink", rot: 8, dur: 6, delay: 600 },
	{ cls: "right-[3%] top-[60%] text-marker-blue", rot: -6, dur: 8, delay: 300 },
	{
		cls: "left-[30%] bottom-[6%] text-marker-amber",
		rot: 14,
		dur: 6.5,
		delay: 900,
	},
];

function HeroConfetti() {
	return (
		<div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
			{confetti.map((c) => (
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

function Hero() {
	return (
		<section className="relative overflow-hidden">
			<HeroConfetti />
			<div className="page-wrap grid items-center gap-12 pt-14 pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
				<div className="rise-in">
					<Badge
						variant="outline"
						className="gap-1.5 rounded-full border-line bg-card px-3 py-1 text-marker-blue-deep"
					>
						<Sparkles className="size-3.5" /> For the class that finally made it
					</Badge>
					<h1 className="font-display mt-5 text-[2.6rem] font-extrabold leading-[1.04] text-ink sm:text-[3.8rem]">
						Your sign-out only happens once. Make it count with{" "}
						<span className="marker-underline text-marker-blue-deep">
							Sign Me Out.
						</span>
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
						Create your own sign-out space now — share one link and let
						coursemates, classmates and loved ones leave signatures, doodles,
						well-wishes and voice notes. Then print it, save a PDF, or wear it.
					</p>

					<div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
						<div className="relative">
							<Button asChild size="lg" className="pop rounded-full">
								<Link to="/signup">
									Create your space <ArrowRight className="size-4" />
								</Link>
							</Button>
							<span className="scrawl absolute -right-24 -top-7 hidden rotate-[-8deg] text-xl text-marker-pink sm:block">
								free, no app!
								<svg
									viewBox="0 0 40 40"
									className="absolute -bottom-5 left-2 size-7 text-marker-pink"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M30 4C26 18 14 26 6 30m0 0 9 1m-9-1 4-9"
										stroke="currentColor"
										strokeWidth="2.4"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
						</div>
					</div>

					<div className="mt-9 flex items-center gap-3">
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
		rot: -1.5,
	},
	{
		icon: Sparkles,
		title: "Doodles",
		body: "Hearts, caps, inside jokes. Draw anywhere on the canvas, in any marker colour.",
		color: "var(--marker-pink)",
		rot: 1.5,
	},
	{
		icon: Type,
		title: "Well-wishes",
		body: "A line, a paragraph, a blessing. Handwritten or typed — however they say it best.",
		color: "var(--marker-blue)",
		rot: -1,
	},
	{
		icon: Mic,
		title: "Voice notes",
		body: "Record a message they can play back forever. The ones that get you teary.",
		color: "var(--marker-amber)",
		rot: 1.5,
	},
];

function LeaveSection() {
	return (
		<section className="page-wrap py-20">
			<div className="max-w-2xl">
				<p className="kicker">One canvas, every kind of love</p>
				<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-[2.6rem]">
					Everything your people can{" "}
					<span
						className="hl"
						style={{ "--hl": "var(--marker-pink)" } as CSSProperties}
					>
						leave
					</span>
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
						className="feature-card wiggle relative gap-3 overflow-hidden border-0 p-6 shadow-none"
						style={{ "--rot": `${t.rot}deg` } as CSSProperties}
					>
						{/* a marker swatch in the corner — the card's "ink" */}
						<span
							className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-[0.12]"
							style={{ backgroundColor: t.color }}
						/>
						<span
							className="grid size-12 place-items-center rounded-2xl"
							style={{
								backgroundColor: `color-mix(in oklab, ${t.color} 16%, white)`,
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

				<Card
					className="feature-card relative justify-between gap-4 overflow-hidden border-0 p-6 text-white shadow-none"
					style={{
						background:
							"linear-gradient(150deg, var(--marker-blue), var(--marker-blue-deep))",
					}}
				>
					<span className="scrawl absolute right-4 top-3 rotate-6 text-2xl text-white/70">
						sign here!
					</span>
					<div>
						<h3 className="font-display text-xl font-bold">Invite everyone</h3>
						<p className="mt-2 text-[15px] leading-relaxed text-white/85">
							Share one link is all you need to get started.
						</p>
					</div>
					<Button
						asChild
						className="pop w-fit rounded-full bg-white text-marker-blue-deep hover:bg-white/90"
					>
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
		body: "Name your sign-out space and you have a free sign-out canvas in seconds — no card needed.",
		color: "var(--marker-green-deep)",
	},
	{
		n: "02",
		title: "Share one link",
		body: "Drop it in the class group. Coursemates and loved ones sign from any where.",
		color: "var(--marker-pink)",
	},
	{
		n: "03",
		title: "Keep it forever",
		body: "Download a PDF, post it to your story, or print it on a shirt you can actually wear.",
		color: "var(--marker-blue)",
	},
];

function HowItWorks() {
	return (
		<section className="border-y border-line bg-paper-2/50 py-20">
			<div className="page-wrap">
				<p className="kicker">From last paper to keepsake</p>
				<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-[2.6rem]">
					Three steps. One unforgettable board.
				</h2>

				<div className="relative mt-12 grid gap-8 md:grid-cols-3">
					{/* a hand-drawn dashed marker line threading the steps */}
					<svg
						className="pointer-events-none absolute -top-2 left-0 hidden h-10 w-full md:block"
						viewBox="0 0 1000 40"
						fill="none"
						aria-hidden="true"
						preserveAspectRatio="none"
					>
						<path
							d="M60 24C220 4 360 36 500 20s300-22 440 4"
							stroke="var(--marker-blue)"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeDasharray="2 10"
							opacity="0.4"
						/>
					</svg>
					{steps.map((s) => (
						<div key={s.n} className="relative">
							<span
								className="font-display grid size-12 place-items-center rounded-2xl text-xl font-extrabold text-white shadow-sm"
								style={{ backgroundColor: s.color }}
							>
								{s.n}
							</span>
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

/* --- wear it: real product mockups, same banner treatment as the wear page --- */
const garments = [
	{
		name: "Sign-out tee",
		tag: "Bestseller",
		image: "/images/tee.png",
		rot: -2,
	},
	{
		name: "Heavy hoodie",
		tag: "Warm",
		image: "/images/hoodie.png",
		rot: 1.5,
	},
	{
		name: "Souvenirs",
		tag: "Classic",
		image: "/images/mug.png",
		rot: -1.5,
	},
];

function PricingSection() {
	return (
		<section className="page-wrap py-20">
			<div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
				<div className="rise-in">
					<p className="kicker">Start free, unlock when it fills up</p>
					<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-[2.6rem]">
						Your first board is{" "}
						<span
							className="hl"
							style={{ "--hl": "var(--marker-amber)" } as CSSProperties}
						>
							free
						</span>
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-ink-soft">
						Open a board, share the link, collect your first 5 signatures — no
						card needed. One unlock of ₦1,200 lifts every limit on that board
						and lets you open as many boards as you like (₦1,000 to unlock each
						new one). No subscriptions, and the people who sign never pay.
					</p>

					<ul className="mt-8 space-y-4">
						{[
							"Unlimited signatures, doodles, well-wishes & voice notes",
							"Download a high-res PDF of your filled board",
							"Open extra boards for every occasion",
							"Your space stays live — share the link anytime",
						].map((item) => (
							<li key={item} className="flex items-start gap-3">
								<span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-marker-blue-deep/15 text-marker-blue-deep">
									<Check className="size-3" />
								</span>
								<span className="text-[15px] text-ink-soft">{item}</span>
							</li>
						))}
					</ul>

					<Button asChild size="lg" className="pop mt-8 rounded-full">
						<Link to="/signup">
							Start your free board <ArrowRight className="size-4" />
						</Link>
					</Button>
				</div>

				<div className="relative hidden lg:block">
					<div
						className="pin rounded-[2rem] border border-line bg-paper-2/80 p-8 shadow-[0_40px_80px_-28px_rgba(27,27,25,0.35)]"
						style={{ "--rot": "-1.8deg" } as CSSProperties}
					>
						<span className="scrawl absolute -top-5 right-6 rotate-[5deg] text-2xl text-marker-pink">
							bargain!
						</span>
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<span className="grid size-12 place-items-center rounded-2xl bg-marker-amber/15">
									<span className="font-display text-2xl font-extrabold text-marker-amber">
										₦
									</span>
								</span>
								<div>
									<span className="font-display block text-4xl font-extrabold text-ink">
										0
									</span>
									<span className="text-sm text-ink-soft">
										your first board — 5 signatures
									</span>
								</div>
							</div>

							<div className="h-px bg-line" />

							<div className="flex items-center justify-between text-sm">
								<span className="text-ink-soft">
									Unlock a board — unlimited signing, exports &amp; voice notes
								</span>
								<span className="font-semibold text-marker-blue-deep">
									₦1,200
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-ink-soft">
									Unlock each extra board after that
								</span>
								<span className="font-semibold text-marker-blue-deep">
									₦1,000
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-ink-soft">Monthly subscription</span>
								<span className="font-semibold text-marker-blue-deep">₦0</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-ink-soft">Per-signature fees</span>
								<span className="font-semibold text-marker-blue-deep">₦0</span>
							</div>

							<div className="h-px bg-line" />

							<div className="flex items-center justify-between">
								<span className="font-display font-bold text-ink">
									To get started
								</span>
								<span className="font-display text-2xl font-extrabold text-marker-blue-deep">
									₦0
								</span>
							</div>
						</div>

						<span className="scrawl mt-4 block text-right text-base text-marker-blue">
							worth every kobo ✨
						</span>
					</div>
				</div>
			</div>
		</section>
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
					<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-[2.6rem]">
						The signed shirt,{" "}
						<span
							className="hl"
							style={{ "--hl": "var(--marker-blue)" } as CSSProperties}
						>
							made real.
						</span>
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-ink-soft">
						It started with markers on a white shirt. Bring the tradition full
						circle — print your finished canvas on fashionable wear you'll
						actually reach for, picked from our drop and delivered to you.
					</p>
					<Button
						asChild
						size="lg"
						className="pop mt-7 rounded-full bg-ink text-paper hover:bg-ink/90"
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
							className="feature-card wiggle overflow-hidden border-0 p-0 shadow-none"
							style={{ "--rot": `${g.rot}deg` } as CSSProperties}
						>
							<div className="relative aspect-[4/3] overflow-hidden bg-paper-2/70">
								<Badge className="absolute left-3 top-3 z-10 rounded-full bg-ink text-[10px] uppercase tracking-wide text-paper">
									{g.tag}
								</Badge>
								<img
									src={g.image}
									alt={g.name}
									loading="lazy"
									className="h-full w-full object-cover"
								/>
							</div>
							<div className="px-4 pb-4">
								<span className="font-display font-bold text-ink">
									{g.name}
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
		<section className="page-wrap pb-16">
			<div
				className="relative overflow-hidden rounded-[2rem] px-6 py-16 text-center text-white sm:px-10"
				style={{
					background:
						"linear-gradient(135deg, var(--marker-blue-deep), var(--marker-blue))",
				}}
			>
				{/* dot grid on the band, like a canvas ready to sign */}
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.18]"
					style={{
						backgroundImage:
							"radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1.4px)",
						backgroundSize: "24px 24px",
					}}
				/>
				<span className="scrawl absolute left-[7%] top-8 hidden rotate-[-8deg] text-3xl text-white/80 sm:block">
					congrats grad!
				</span>
				<span className="scrawl absolute right-[9%] bottom-10 hidden rotate-6 text-3xl text-white/80 sm:block">
					class of '26 🎓
				</span>
				<div className="relative">
					<h2 className="font-display mx-auto max-w-2xl text-3xl font-extrabold leading-tight sm:text-[3.2rem]">
						Create your own sign-out space now.
					</h2>
					<p className="mx-auto mt-4 max-w-lg text-lg text-white/85">
						Open your canvas today and let everyone leave their mark.
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Button
							asChild
							size="lg"
							className="pop rounded-full bg-white text-marker-blue-deep hover:bg-white/90"
						>
							<Link to="/signup">
								Create your space <ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="ghost"
							className="pop rounded-full text-white hover:bg-white/15 hover:text-white"
						>
							<Link to="/how-it-works">
								<Check className="size-4" /> See how it works
							</Link>
						</Button>
					</div>
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
			<PricingSection />
			<WearSection />
			<ClosingBand />
		</>
	);
}
