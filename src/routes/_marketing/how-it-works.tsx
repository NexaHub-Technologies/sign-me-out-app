import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Download,
	Link2,
	MousePointer2,
	Share2,
} from "lucide-react";

import { Button } from "#/components/ui/button.tsx";
import { Card } from "#/components/ui/card.tsx";

export const Route = createFileRoute("/_marketing/how-it-works")({
	component: HowItWorksPage,
});

const steps = [
	{
		n: "01",
		icon: MousePointer2,
		title: "Open your space",
		body: "Sign up, name your sign-out, and pick a board colour. You get an infinite canvas built with real ink — pressure-sensitive pen, doodles, well-wishes and voice notes.",
	},
	{
		n: "02",
		icon: Link2,
		title: "Share one link",
		body: "Send your link to the class group, your besties, and your family. Anyone with the link can sign — no account, no app, straight from their phone.",
	},
	{
		n: "03",
		icon: Share2,
		title: "Watch it fill up",
		body: "Signatures, well-wishes and recordings land on the board live. Pinch, zoom and pan around the canvas as your people leave their mark.",
	},
	{
		n: "04",
		icon: Download,
		title: "Keep it forever",
		body: "Download a high-res PDF, post it to your story, or send it to print on fashionable wear you can keep.",
	},
];

const faqs = [
	{
		q: "Do people need an account to sign?",
		a: "No. Anyone with your link can open the canvas and leave a signature, doodle or voice note. Only you need an account to create and manage the space.",
	},
	{
		q: "How many people can sign?",
		a: "As many as you like — the canvas is infinite. Invite your whole department.",
	},
	{
		q: "Can I download it?",
		a: "Yes. Export a high-resolution PDF or image any time, and order it printed on wear from our drop.",
	},
	{
		q: "Is it free?",
		a: "Opening a space and collecting signatures is free. You only pay if you order printed wear.",
	},
];

function HowItWorksPage() {
	return (
		<div className="page-wrap py-16">
			<header className="max-w-2xl">
				<p className="kicker">How it works</p>
				<h1 className="font-display mt-3 text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
					From your last paper to a keepsake you can hold.
				</h1>
				<p className="mt-5 text-lg text-ink-soft">
					Sign Me Out turns the signed-shirt tradition into a board everyone can
					reach — here's the whole journey.
				</p>
			</header>

			<div className="mt-14 grid gap-6 md:grid-cols-2">
				{steps.map((s) => (
					<Card
						key={s.n}
						className="feature-card flex-row gap-5 border-0 p-7 shadow-none"
					>
						<span className="font-display grid size-12 shrink-0 place-items-center rounded-2xl bg-paper-2 text-xl font-extrabold text-marker-green-deep">
							{s.n}
						</span>
						<div>
							<div className="mb-2 flex items-center gap-2">
								<s.icon className="size-5 text-marker-green-deep" />
								<h2 className="font-display text-xl font-bold text-ink">
									{s.title}
								</h2>
							</div>
							<p className="text-[15px] leading-relaxed text-ink-soft">
								{s.body}
							</p>
						</div>
					</Card>
				))}
			</div>

			<section className="mt-20">
				<h2 className="font-display text-2xl font-bold text-ink">
					Questions, answered
				</h2>
				<div className="mt-6 grid gap-4 md:grid-cols-2">
					{faqs.map((f) => (
						<div
							key={f.q}
							className="rounded-2xl border border-line bg-card p-6"
						>
							<h3 className="font-semibold text-ink">{f.q}</h3>
							<p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
								{f.a}
							</p>
						</div>
					))}
				</div>
			</section>

			<div className="mt-16 flex flex-col gap-3 sm:flex-row">
				<Button asChild size="lg" className="rounded-full">
					<Link to="/signup">
						Create your space <ArrowRight className="size-4" />
					</Link>
				</Button>
				<Button asChild size="lg" variant="outline" className="rounded-full">
					<Link to="/s/$spaceId" params={{ spaceId: "demo" }}>
						Peek at a live space
					</Link>
				</Button>
			</div>
		</div>
	);
}
