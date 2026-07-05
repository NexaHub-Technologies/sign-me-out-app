import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { CSSProperties } from "react";

import { Logo } from "#/components/logo.tsx";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

const sideScrawls = [
	{
		t: "we made it!! 🎓",
		c: "var(--marker-green-deep)",
		cls: "left-10 top-14",
		r: -6,
		delay: 200,
	},
	{
		t: "final year baddie ✨",
		c: "var(--marker-pink)",
		cls: "right-12 top-36",
		r: 5,
		delay: 450,
	},
	{
		t: "no more night class 🙏",
		c: "var(--marker-amber)",
		cls: "left-14 top-[42%]",
		r: -3,
		delay: 700,
	},
	{
		t: "to the moon 🚀",
		c: "var(--marker-blue)",
		cls: "left-20 bottom-44",
		r: 4,
		delay: 950,
	},
	{
		t: "— Ada 💚",
		c: "var(--ink)",
		cls: "right-16 bottom-28",
		r: -8,
		delay: 1200,
	},
];

function AuthLayout() {
	return (
		<div className="grid min-h-screen lg:grid-cols-2">
			{/* form side */}
			<div className="flex flex-col px-6 py-8 sm:px-10">
				<Logo />
				<div className="flex flex-1 items-center justify-center py-10">
					<div className="w-full max-w-sm">
						<Outlet />
					</div>
				</div>
			</div>

			{/* board side — a living sign-out canvas */}
			<div
				className="relative hidden overflow-hidden border-l border-line lg:block"
				style={{
					background:
						"linear-gradient(150deg, color-mix(in oklab, var(--marker-blue) 12%, var(--paper-2)), var(--paper-2))",
				}}
			>
				<div
					className="pointer-events-none absolute inset-0 opacity-60"
					style={{
						backgroundImage:
							"radial-gradient(var(--line) 1px, transparent 1.4px)",
						backgroundSize: "24px 24px",
					}}
				/>

				{/* marker swoosh that draws itself on */}
				<svg
					className="pointer-events-none absolute inset-0 size-full"
					viewBox="0 0 600 900"
					fill="none"
					aria-hidden="true"
					preserveAspectRatio="none"
				>
					<path
						className="draw-on"
						style={{ "--len": "1200", "--delay": "300ms" } as CSSProperties}
						d="M80 360c120 70 220-120 320-70s120 200 130 240"
						stroke="var(--marker-blue)"
						strokeWidth="6"
						strokeLinecap="round"
						opacity="0.4"
					/>
				</svg>

				{sideScrawls.map((s) => (
					<span
						key={s.t}
						className={`scrawl land-in absolute text-3xl ${s.cls}`}
						style={
							{
								color: s.c,
								"--rot": `${s.r}deg`,
								"--delay": `${s.delay}ms`,
							} as CSSProperties
						}
					>
						{s.t}
					</span>
				))}

				{/* a drifting collaborator cursor */}
				<div className="cursor-drift absolute left-[46%] top-[34%]">
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

				{/* a taped polaroid */}
				<div
					className="tape land-in absolute right-14 top-[52%] w-28 rotate-6 rounded-lg border border-line bg-white p-2 shadow-lg"
					style={
						{
							"--delay": "1450ms",
							"--tape": "var(--marker-amber)",
						} as CSSProperties
					}
				>
					<div className="grid h-20 place-items-center rounded bg-gradient-to-br from-marker-amber/40 to-marker-pink/30">
						<Heart className="size-6 text-marker-pink/80" />
					</div>
					<p className="scrawl mt-1 text-center text-base text-ink-soft">
						the squad 📸
					</p>
				</div>

				<div className="absolute bottom-12 left-12 right-12">
					<p className="font-display text-2xl font-bold leading-snug text-ink">
						Your board is waiting for its{" "}
						<span
							className="hl"
							style={{ "--hl": "var(--marker-blue)" } as CSSProperties}
						>
							first signature.
						</span>
					</p>
				</div>
			</div>
		</div>
	);
}
