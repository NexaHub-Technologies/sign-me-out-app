import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Coffee,
	CupSoda,
	Shirt,
	Sparkles,
	Truck,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

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
		shirt: "var(--marker-green-deep)",
	},
	{
		name: "Heavy hoodie",
		tag: "Warm",
		blurb:
			"Brushed fleece, kangaroo pocket. Big-print canvas, embroidered name.",
		shirt: "var(--marker-pink)",
	},
	{
		name: "Crew sweatshirt",
		tag: "Classic",
		blurb:
			"Roomy, ribbed cuffs. Canvas on the front, class year on the sleeve.",
		shirt: "var(--marker-blue)",
	},
	{
		name: "Tote bag",
		tag: "Everyday",
		blurb: "Sturdy canvas tote. Carry your sign-out to the next chapter.",
		shirt: "var(--marker-amber)",
	},
	{
		name: "Cap",
		tag: "New",
		blurb: "Embroidered six-panel. A small doodle, a big statement.",
		shirt: "var(--marker-green-deep)",
	},
	{
		name: "Framed print",
		tag: "Keepsake",
		blurb: "A3 archival print, framed. The board for your wall.",
		shirt: "var(--marker-pink)",
	},
];

const souvenirs: {
	name: string;
	tag: string;
	blurb: string;
	color: string;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{
		name: "Mug",
		tag: "Bestseller",
		blurb: "Ceramic 11oz mug. Your canvas wrapped around your morning coffee.",
		color: "var(--marker-amber)",
		icon: Coffee,
	},
	{
		name: "Travel cup",
		tag: "On the go",
		blurb: "Reusable tumbler with lid. Sip your sign-out anywhere.",
		color: "var(--marker-blue)",
		icon: CupSoda,
	},
];

const steps = [
	"Fill your canvas with signatures",
	"Pick a piece and a print layout",
	"We print and deliver to your door",
];

function TeeMock({ color }: { color: string }) {
	return (
		<svg viewBox="0 0 200 200" className="h-44 w-auto" aria-hidden="true">
			<title>garment</title>
			<path
				d="M64 36 40 50 26 86l22 12 8-14v82h88V84l8 14 22-12-14-36-24-14-10 6a26 16 0 0 1-52 0z"
				fill={color}
				opacity="0.92"
			/>
			<rect
				x="76"
				y="90"
				width="48"
				height="56"
				rx="4"
				fill="#fff"
				opacity="0.96"
			/>
			<path
				d="M82 104c6-2 8 8 12 6s4-10 8-10"
				stroke={color}
				strokeWidth="2.4"
				fill="none"
				strokeLinecap="round"
			/>
			<path
				d="M84 124h32M84 134h22"
				stroke={color}
				strokeWidth="2.4"
				strokeLinecap="round"
				opacity="0.6"
			/>
		</svg>
	);
}

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
			<div className="relative grid h-44 place-items-center bg-paper-2/70">
				<Badge className="absolute left-4 top-4 rounded-full bg-ink text-[10px] uppercase tracking-wide text-paper">
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
						<Check className="size-4 text-marker-green-deep" /> {s}
					</span>
				))}
			</div>

			<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{garments.map((p) => (
					<ProductCard key={p.name} name={p.name} tag={p.tag} blurb={p.blurb}>
						<TeeMock color={p.shirt} />
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
							<span
								className="grid size-24 place-items-center rounded-3xl bg-white shadow-sm"
								style={{ color: s.color } as CSSProperties}
							>
								<s.icon className="size-12" />
							</span>
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
						<f.icon className="size-5 text-marker-green-deep" />
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
