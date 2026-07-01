import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import {
	Check,
	Link2,
	Loader2,
	Lock,
	LockOpen,
	Palette,
	Shirt,
} from "lucide-react";
import { lazy, useEffect, useRef, useState } from "react";

import { Logo } from "#/components/logo.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ClientOnly } from "#/features/canvas/client-only.tsx";
import { exportCanvas } from "#/features/canvas/export-canvas.ts";
import { ExportPicker } from "#/features/canvas/export-picker.tsx";
import type { SignCanvasHandle } from "#/features/canvas/sign-canvas.tsx";
import { GiftCard } from "#/features/gift/gift-card.tsx";
import { BOARD_COLORS, boardColorById } from "#/lib/board-colors.ts";
import { cn } from "#/lib/utils.ts";
import { getSpaceBySlug, lockSpace, setBoardColor } from "#/server/spaces.ts";

const SignCanvas = lazy(() => import("#/features/canvas/sign-canvas.tsx"));

export const Route = createFileRoute("/s/$spaceId")({
	ssr: false,
	loader: async ({ params }) => {
		const data = await getSpaceBySlug({ data: params.spaceId });
		if (!data) throw notFound();
		return data;
	},
	component: SpacePage,
	notFoundComponent: SpaceNotFound,
});

function SpacePage() {
	const { space, marks, isHost } = Route.useLoaderData();
	const router = useRouter();
	const [copied, setCopied] = useState(false);
	const [locking, setLocking] = useState(false);
	const [boardColorId, setBoardColorId] = useState(space.boardColor);
	const canvasRef = useRef<SignCanvasHandle>(null);
	const locked = space.status === "locked";
	const board = boardColorById(boardColorId);

	async function changeBoardColor(id: string) {
		const prev = boardColorId;
		setBoardColorId(id); // optimistic — the board recolours instantly
		try {
			await setBoardColor({ data: { slug: space.slug, boardColor: id } });
		} catch {
			setBoardColorId(prev);
		}
	}

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

	async function toggleLock() {
		setLocking(true);
		try {
			await lockSpace({ data: { slug: space.slug, locked: !locked } });
			await router.invalidate();
		} finally {
			setLocking(false);
		}
	}

	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-paper-2/40">
			<header className="z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper/85 px-3 backdrop-blur-md sm:px-4">
				<div className="flex min-w-0 items-center gap-3">
					<Logo to="/dashboard" />
					<span className="hidden h-6 w-px bg-line sm:block" />
					<div className="hidden min-w-0 sm:block">
						<p className="flex items-center gap-1.5 truncate font-display text-sm font-bold text-ink">
							{space.title}
							{locked && <Lock className="size-3.5 text-ink-faint" />}
						</p>
						<p className="truncate text-xs text-ink-faint">
							/s/{space.slug} · {marks.length}{" "}
							{marks.length === 1 ? "mark" : "marks"}
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
					{isHost && (
						<BoardColorPicker
							value={boardColorId}
							onChange={changeBoardColor}
						/>
					)}
					{isHost && (
						<Button
							variant="outline"
							size="sm"
							onClick={toggleLock}
							disabled={locking}
						>
							{locking ? (
								<Loader2 className="size-4 animate-spin" />
							) : locked ? (
								<LockOpen className="size-4" />
							) : (
								<Lock className="size-4" />
							)}
							<span className="hidden sm:inline">
								{locked ? "Unlock" : "Lock"}
							</span>
						</Button>
					)}
					{isHost && (
						<ExportPicker
							onExport={(format) => {
								const stage = canvasRef.current?.getStage();
								if (!stage) return;
								exportCanvas(stage, format, space.slug || "sign-me-out");
							}}
						/>
					)}
					<Button asChild size="sm">
						<Link to="/wear">
							<Shirt className="size-4" />
							<span className="hidden sm:inline">Wear it</span>
						</Link>
					</Button>
				</div>
			</header>

			{/* Canvas region — Konva board mounts client-side over the dotted paper. */}
			<div
				className="relative flex-1 overflow-hidden transition-colors duration-300"
				style={{
					backgroundColor: board.bg,
					backgroundImage: `radial-gradient(${board.dot} 1px, transparent 1.4px)`,
					backgroundSize: "26px 26px",
				}}
			>
				<ClientOnly>
					{() => (
						<SignCanvas
							ref={canvasRef}
							space={{ id: space.id, slug: space.slug, status: space.status }}
							initialMarks={marks}
							isHost={isHost}
						/>
					)}
				</ClientOnly>

				<GiftCard
					slug={space.slug}
					gift={{
						bankName: space.giftBankName,
						accountNumber: space.giftAccountNumber,
						accountName: space.giftAccountName,
					}}
					isHost={isHost}
				/>
			</div>
		</div>
	);
}

/** Host-only board-colour picker — a swatch button with a popover palette. */
function BoardColorPicker({
	value,
	onChange,
}: {
	value: string;
	onChange: (id: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const current = boardColorById(value);

	useEffect(() => {
		if (!open) return;
		function onDown(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={open}
			>
				<Palette className="size-4" />
				<span className="hidden sm:inline">Board</span>
			</Button>
			{open && (
				<div
					role="menu"
					className="paper-card absolute right-0 z-50 mt-2 w-56 rounded-2xl p-3"
				>
					<p className="kicker mb-2">Board colour</p>
					<div className="grid grid-cols-6 gap-2">
						{BOARD_COLORS.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => {
									onChange(c.id);
									setOpen(false);
								}}
								title={c.label}
								aria-label={c.label}
								aria-pressed={value === c.id}
								className={cn(
									"size-7 rounded-full border transition-transform",
									value === c.id
										? "border-transparent ring-2 ring-marker-green ring-offset-2 ring-offset-card"
										: "border-line hover:scale-110",
								)}
								style={{ backgroundColor: c.bg }}
							/>
						))}
					</div>
					<p className="mt-2 text-xs text-ink-soft">{current.label}</p>
				</div>
			)}
		</div>
	);
}

function SpaceNotFound() {
	return (
		<div className="grid min-h-screen place-items-center px-6 text-center">
			<div>
				<Logo />
				<h1 className="font-display mt-6 text-3xl font-extrabold text-ink">
					This space doesn't exist
				</h1>
				<p className="mt-2 text-ink-soft">
					The link may be wrong, or the board was removed.
				</p>
				<Button asChild className="mt-6 rounded-full">
					<Link to="/create">Create your own space</Link>
				</Button>
			</div>
		</div>
	);
}
