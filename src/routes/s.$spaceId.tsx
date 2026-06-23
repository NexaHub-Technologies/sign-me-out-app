import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Check,
	Download,
	Eraser,
	Hand,
	ImageIcon,
	Link2,
	Mic,
	PenLine,
	Shirt,
	Sticker,
	Type,
} from "lucide-react";
import { useState } from "react";

import { Logo } from "#/components/logo.tsx";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/s/$spaceId")({
	component: SpaceCanvas,
});

const tools = [
	{ id: "pen", label: "Pen", icon: PenLine },
	{ id: "text", label: "Text", icon: Type },
	{ id: "doodle", label: "Sticker", icon: Sticker },
	{ id: "image", label: "Photo", icon: ImageIcon },
	{ id: "voice", label: "Voice note", icon: Mic },
	{ id: "eraser", label: "Eraser", icon: Eraser },
	{ id: "pan", label: "Move", icon: Hand },
] as const;

const markerColors = [
	{ id: "ink", value: "var(--ink)" },
	{ id: "green", value: "var(--marker-green-deep)" },
	{ id: "pink", value: "var(--marker-pink)" },
	{ id: "blue", value: "var(--marker-blue)" },
	{ id: "amber", value: "var(--marker-amber)" },
];

// Sample marks already on the board — replace with live data from the space.
const placed = [
	{
		t: "We made it!! 🎓",
		c: "var(--marker-green-deep)",
		cls: "left-[12%] top-[18%]",
		r: -6,
		s: "text-4xl",
	},
	{
		t: "final year baddie ✨",
		c: "var(--marker-pink)",
		cls: "right-[16%] top-[24%]",
		r: 5,
		s: "text-3xl",
	},
	{
		t: "best of luck out there",
		c: "var(--marker-blue)",
		cls: "left-[10%] top-[40%]",
		r: -2,
		s: "text-2xl",
	},
	{
		t: "miss you already",
		c: "var(--ink)",
		cls: "right-[22%] bottom-[30%]",
		r: 4,
		s: "text-3xl",
	},
	{
		t: "— Ada",
		c: "var(--marker-green-deep)",
		cls: "left-[20%] bottom-[20%]",
		r: -8,
		s: "text-4xl",
	},
];

function SpaceCanvas() {
	const { spaceId } = Route.useParams();
	const [tool, setTool] = useState<string>("pen");
	const [color, setColor] = useState("green");
	const [copied, setCopied] = useState(false);

	async function copyLink() {
		if (typeof window === "undefined") return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			/* clipboard unavailable */
		}
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-paper-2/40">
			{/* toolbar */}
			<header className="z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper/85 px-3 backdrop-blur-md sm:px-4">
				<div className="flex min-w-0 items-center gap-3">
					<Logo to="/dashboard" />
					<span className="hidden h-6 w-px bg-line sm:block" />
					<div className="hidden min-w-0 sm:block">
						<p className="truncate font-display text-sm font-bold text-ink">
							CSC Class of 2026
						</p>
						<p className="truncate text-xs text-ink-faint">
							/s/{spaceId} · 248 signatures
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={copyLink}>
						{copied ? (
							<Check className="size-4" />
						) : (
							<Link2 className="size-4" />
						)}
						<span className="hidden sm:inline">
							{copied ? "Link copied" : "Share"}
						</span>
					</Button>
					<Button variant="outline" size="sm">
						<Download className="size-4" />
						<span className="hidden sm:inline">Export</span>
					</Button>
					<Button asChild size="sm">
						<Link to="/wear">
							<Shirt className="size-4" />
							<span className="hidden sm:inline">Wear it</span>
						</Link>
					</Button>
				</div>
			</header>

			{/* canvas + tool dock */}
			<div className="relative flex-1 overflow-hidden">
				{/*
          KONVA STAGE MOUNTS HERE.
          - <Stage> fills this container; layers hold each placed mark.
          - Freehand pen strokes are captured with perfect-freehand
            (getStroke(points)) and rendered as a Konva.Line / Path per stroke.
          - Pan/zoom via stage draggable + wheel scaling; text, image and
            voice-note nodes are Konva groups positioned on pointer-up.
          The markup below is the styled empty/loading state and sample marks.
        */}
				<div
					className="absolute inset-0"
					style={{
						backgroundColor: "var(--paper)",
						backgroundImage:
							"radial-gradient(var(--line) 1px, transparent 1.4px)",
						backgroundSize: "26px 26px",
					}}
				/>

				{placed.map((m) => (
					<span
						key={m.t}
						className={cn("scrawl pointer-events-none absolute", m.s, m.cls)}
						style={{ color: m.c, transform: `rotate(${m.r}deg)` }}
					>
						{m.t}
					</span>
				))}

				{/* a quiet hint for the first-time signer */}
				<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
					<p className="font-display text-lg font-bold text-ink/55">
						Pick the pen and leave your mark
					</p>
					<p className="scrawl mt-1 text-2xl text-marker-green-deep/60">
						sign right here ✍️
					</p>
				</div>

				{/* tool dock */}
				<div className="absolute left-1/2 bottom-5 z-20 -translate-x-1/2">
					<div className="flex items-center gap-1 rounded-2xl border border-line bg-surface-strong p-1.5 shadow-lg backdrop-blur-md">
						{tools.map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => setTool(t.id)}
								title={t.label}
								aria-label={t.label}
								aria-pressed={tool === t.id}
								className={cn(
									"grid size-10 place-items-center rounded-xl transition-colors",
									tool === t.id
										? "bg-marker-green-deep text-white"
										: "text-ink-soft hover:bg-ink/5 hover:text-ink",
								)}
							>
								<t.icon className="size-5" />
							</button>
						))}

						<span className="mx-1 h-7 w-px bg-line" />

						{markerColors.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => setColor(c.id)}
								title={`${c.id} marker`}
								aria-label={`${c.id} marker`}
								aria-pressed={color === c.id}
								className={cn(
									"grid size-9 place-items-center rounded-full transition-transform",
									color === c.id ? "scale-110" : "opacity-80 hover:opacity-100",
								)}
							>
								<span
									className={cn(
										"size-6 rounded-full border-2",
										color === c.id ? "border-ink/40" : "border-white",
									)}
									style={{ backgroundColor: c.value }}
								/>
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
