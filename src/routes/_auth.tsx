import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Logo } from "#/components/logo.tsx";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

const sideScrawls = [
	{
		t: "we made it!! 🎓",
		c: "var(--marker-green-deep)",
		cls: "left-10 top-16",
		r: -6,
	},
	{
		t: "final year baddie ✨",
		c: "var(--marker-pink)",
		cls: "right-12 top-40",
		r: 5,
	},
	{
		t: "no more night class 🙏",
		c: "var(--marker-blue)",
		cls: "left-14 top-72",
		r: -3,
	},
	{
		t: "to the moon 🚀",
		c: "var(--marker-amber)",
		cls: "left-20 bottom-40",
		r: 4,
	},
	{ t: "— Ada", c: "var(--ink)", cls: "right-16 bottom-24", r: -8 },
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

			{/* board side */}
			<div className="relative hidden overflow-hidden border-l border-line bg-paper-2/60 lg:block">
				<div
					className="pointer-events-none absolute inset-0 opacity-60"
					style={{
						backgroundImage:
							"radial-gradient(var(--line) 1px, transparent 1.4px)",
						backgroundSize: "24px 24px",
					}}
				/>
				{sideScrawls.map((s) => (
					<span
						key={s.t}
						className={`scrawl absolute text-3xl ${s.cls}`}
						style={{ color: s.c, transform: `rotate(${s.r}deg)` }}
					>
						{s.t}
					</span>
				))}
				<div className="absolute bottom-12 left-12 right-12">
					<p className="font-display text-2xl font-bold text-ink">
						Your board is waiting for its first signature.
					</p>
				</div>
			</div>
		</div>
	);
}
