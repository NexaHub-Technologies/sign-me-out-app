import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Shirt, Sparkles, Truck } from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card } from "#/components/ui/card.tsx";

export const Route = createFileRoute("/_marketing/wear")({
	component: WearPage,
});

const garments = [
	{
		name: "Sign-out tee",
		tag: "Bestseller",
		blurb: "Soft heavyweight cotton. Your full canvas across the back.",
		image: "/images/tee.png",
	},
	{
		name: "Heavy hoodie",
		tag: "Warm",
		blurb:
			"Brushed fleece, kangaroo pocket. Big-print canvas, embroidered name.",
		image: "/images/hoodie.png",
	},
	{
		name: "Tote bag",
		tag: "Everyday",
		blurb: "Sturdy canvas tote. Carry your sign-out to the next chapter.",
		image: "/images/tote-bag.png",
	},
	{
		name: "Cap",
		tag: "New",
		blurb: "Embroidered six-panel. A small doodle, a big statement.",
		image: "/images/cap.png",
	},
	{
		name: "Framed print",
		tag: "Keepsake",
		blurb: "A3 archival print, framed. The board for your wall.",
		image: "/images/framed.png",
	},
];

const souvenirs: {
	name: string;
	tag: string;
	blurb: string;
	color: string;
	image: string;
}[] = [
	{
		name: "Mug",
		tag: "Bestseller",
		blurb: "Ceramic 11oz mug. Your canvas wrapped around your morning coffee.",
		color: "var(--marker-amber)",
		image: "/images/mug.png",
	},
	{
		name: "Travel cup",
		tag: "On the go",
		blurb: "Reusable tumbler with lid. Sip your sign-out anywhere.",
		color: "var(--marker-blue)",
		image: "/images/fancy-cup.png",
	},
];

const steps = [
	"Fill your canvas with signatures",
	"Pick a piece and a print layout",
	"We print and deliver to your door",
];

function ProductCard({
	name,
	tag,
	blurb,
	children,
}: {
	name: string;
	tag: string;
	blurb: string;
	children: React.ReactNode;
}) {
	return (
		<Card className="feature-card overflow-hidden border-0 p-0 shadow-none">
			<div className="relative flex h-56 items-center justify-center bg-paper-2/70 p-4">
				<Badge className="absolute left-4 top-4 z-10 rounded-full bg-ink text-[10px] uppercase tracking-wide text-paper">
					{tag}
				</Badge>
				{children}
			</div>
			<div className="p-5">
				<h2 className="font-display text-lg font-bold text-ink">{name}</h2>
				<p className="mt-2 text-sm leading-relaxed text-ink-soft">{blurb}</p>
				<Button asChild variant="outline" className="mt-4 w-full rounded-full">
					<Link to="/customize">Customise & order</Link>
				</Button>
			</div>
		</Card>
	);
}

function WearPage() {
	return (
		<div className="page-wrap py-16">
			<header className="max-w-2xl">
				<p className="kicker inline-flex items-center gap-2">
					<Shirt className="size-3.5" /> Wear your sign-out
				</p>
				<h1 className="font-display mt-3 text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
					The signed shirt, brought full circle.
				</h1>
				<p className="mt-5 text-lg text-ink-soft">
					Your finished canvas, printed on fashionable wear and keepsakes you'll
					actually reach for. Pick a piece, choose a layout, and we'll deliver
					it.
				</p>
			</header>

			<div className="mt-9 flex flex-wrap gap-3">
				{steps.map((s) => (
					<span
						key={s}
						className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-ink-soft"
					>
						<Check className="size-4 text-marker-blue-deep" /> {s}
					</span>
				))}
			</div>

			<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{garments.map((p) => (
					<ProductCard key={p.name} name={p.name} tag={p.tag} blurb={p.blurb}>
						<img
							src={p.image}
							alt={p.name}
							className="max-h-full max-w-full object-contain"
						/>
					</ProductCard>
				))}
			</div>

			<section className="mt-16">
				<p className="kicker inline-flex items-center gap-2">
					<Sparkles className="size-3.5" /> Souvenirs
				</p>
				<h2 className="font-display mt-3 text-3xl font-bold text-ink sm:text-4xl">
					Little keepsakes, big memories.
				</h2>
				<p className="mt-4 max-w-2xl text-lg text-ink-soft">
					Print your board on mugs, cups, wristbands and key chains — small
					things you'll carry long after the last paper.
				</p>

				<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{souvenirs.map((s) => (
						<ProductCard key={s.name} name={s.name} tag={s.tag} blurb={s.blurb}>
							<img
								src={s.image}
								alt={s.name}
								className="max-h-full max-w-full object-contain"
							/>
						</ProductCard>
					))}
				</div>
			</section>

			<section className="mt-16 grid gap-5 sm:grid-cols-3">
				{[
					{
						icon: Sparkles,
						t: "Premium print",
						b: "Fade-resistant printing that survives the wash.",
					},
					{
						icon: Truck,
						t: "Delivered to you",
						b: "Nationwide delivery, 3–5 working days.",
					},
					{
						icon: Check,
						t: "Made to order",
						b: "Every piece is printed just for your sign-out.",
					},
				].map((f) => (
					<div key={f.t} className="rounded-2xl border border-line bg-card p-6">
						<f.icon className="size-5 text-marker-blue-deep" />
						<h3 className="font-display mt-3 font-bold text-ink">{f.t}</h3>
						<p className="mt-1 text-sm text-ink-soft">{f.b}</p>
					</div>
				))}
			</section>

			<div className="mt-14 flex flex-col gap-3 sm:flex-row">
				<Button asChild size="lg" className="rounded-full">
					<Link to="/customize">
						Customise & order <ArrowRight className="size-4" />
					</Link>
				</Button>
				<Button asChild size="lg" variant="outline" className="rounded-full">
					<Link to="/signup">Start your canvas first</Link>
				</Button>
			</div>
		</div>
	);
}
