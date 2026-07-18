import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import {
	CircleHelp,
	Download,
	FileCode,
	FileImage,
	FileText,
	Image,
	Link2,
	Loader2,
	Lock,
	LockOpen,
	MoreVertical,
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
import { ShareDialog } from "#/features/share/share-dialog.tsx";
import {
	buildSpaceTourSteps,
	useSpaceTour,
} from "#/features/tour/space-tour.ts";
import { SpotlightTour } from "#/features/tour/spotlight-tour.tsx";
import { UnlockButton } from "#/features/upgrade/unlock-button.tsx";
import { BOARD_COLORS, boardColorById } from "#/lib/board-colors.ts";
import { hasGift } from "#/lib/gift.ts";
import { pageMeta } from "#/lib/seo.ts";
import { cn } from "#/lib/utils.ts";
import { getSpaceBySlug, lockSpace, setBoardColor } from "#/server/spaces.ts";

const SignCanvas = lazy(() => import("#/features/canvas/sign-canvas.tsx"));

export const Route = createFileRoute("/s/$spaceId")({
	// 'data-only': run the loader and render <head> on the server (so a shared
	// /s/<slug> link unfurls with the board's title + mark count), but skip
	// server-rendering the component — the Konva canvas is client-only.
	ssr: "data-only",
	validateSearch: (search: Record<string, unknown>): { welcome?: boolean } => ({
		welcome:
			search.welcome === true || search.welcome === 1 || search.welcome === "1"
				? true
				: undefined,
	}),
	loader: async ({ params }) => {
		const data = await getSpaceBySlug({ data: params.spaceId });
		if (!data) throw notFound();
		return data;
	},
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const { space, marks } = loaderData;
		const count = marks.length;
		const signed =
			count === 0
				? "Be the first to sign."
				: `${count} ${count === 1 ? "mark" : "marks"} so far — add yours.`;
		return {
			meta: pageMeta({
				title: `${space.title} — Sign Me Out`,
				description: `Leave a signature, doodle, photo or voice note on ${space.title}. ${signed}`,
				path: `/s/${space.slug}`,
			}),
		};
	},
	component: SpacePage,
	notFoundComponent: SpaceNotFound,
});

function SpacePage() {
	const { space, marks, isHost, sealed, unlockPriceKobo } =
		Route.useLoaderData();
	const router = useRouter();
	const [shareOpen, setShareOpen] = useState(false);
	const [locking, setLocking] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [boardColorId, setBoardColorId] = useState(space.boardColor);
	// The header badge starts from the loader snapshot, then tracks the
	// canvas's live (optimistic + realtime) count once it mounts.
	const [markCount, setMarkCount] = useState(marks.length);
	const canvasRef = useRef<SignCanvasHandle>(null);
	const locked = space.status === "locked";
	const board = boardColorById(boardColorId);
	const { welcome } = Route.useSearch();
	const tour = useSpaceTour({ welcome: welcome === true });

	async function changeBoardColor(id: string) {
		const prev = boardColorId;
		setBoardColorId(id); // optimistic — the board recolours instantly
		try {
			await setBoardColor({ data: { slug: space.slug, boardColor: id } });
		} catch {
			setBoardColorId(prev);
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

	function flashNotice(message: string) {
		setNotice(message);
		setTimeout(() => setNotice(null), 4000);
	}

	return (
		<div className="relative h-dvh overflow-hidden bg-paper-2/40">
			{/* Canvas region — fills the whole viewport; the header floats above it. */}
			<div
				className="absolute inset-0 transition-colors duration-300"
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
							space={{
								id: space.id,
								slug: space.slug,
								status: space.status,
								revealAt: space.revealAt,
								isPremium: space.isPremium,
								ownerId: space.ownerId,
							}}
							initialMarks={marks}
							isHost={isHost}
							sealed={sealed}
							onMarkCountChange={setMarkCount}
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

				{/* Replay the tour — tucked bottom-left, clear of the dock and chips. */}
				<button
					type="button"
					onClick={tour.start}
					title="Replay the tour"
					aria-label="Replay the tour"
					className="glass-pill absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-20 grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-card hover:text-ink"
				>
					<CircleHelp className="size-4.5" />
				</button>
			</div>

			<header className="paper-card absolute inset-x-3 top-3 z-40 flex items-center justify-between gap-2 rounded-2xl px-2.5 py-2 sm:inset-x-4 sm:gap-3 sm:px-4 sm:py-2.5">
				<div className="flex min-w-0 items-center gap-2 sm:gap-3">
					<Logo
						to="/dashboard"
						className="[&>span]:hidden sm:[&>span]:inline"
					/>
					<span className="hidden h-6 w-px bg-line sm:block" />
					<div className="hidden min-w-0 sm:block">
						<p className="flex items-center gap-1.5 truncate font-display text-sm font-bold text-ink">
							{space.title}
							{locked && <Lock className="size-3.5 text-ink-faint" />}
						</p>
						<p className="truncate text-xs text-ink-faint">
							/s/{space.slug} · {markCount} {markCount === 1 ? "mark" : "marks"}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 sm:gap-2">
					<Button
						variant="outline"
						size="sm"
						data-tour="share"
						onClick={() => setShareOpen(true)}
					>
						<Link2 className="size-4" />
						<span className="hidden sm:inline">Share</span>
					</Button>
					{/* Board colour, Lock, and locked-tier Export are desktop-only inline —
					    on mobile they move into MoreMenu below to keep the header from
					    crowding out with 6+ controls on a phone-width screen. */}
					{isHost && (
						<div className="hidden sm:contents">
							<BoardColorPicker
								value={boardColorId}
								onChange={changeBoardColor}
							/>
						</div>
					)}
					{isHost && (
						<Button
							variant="outline"
							size="sm"
							data-tour="lock"
							onClick={toggleLock}
							disabled={locking}
							className="hidden sm:inline-flex"
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
					{isHost &&
						(space.isPremium ? (
							<div className="hidden sm:contents">
								<ExportPicker
									onExport={(format) => {
										const stage = canvasRef.current?.getStage();
										if (!stage) return;
										exportCanvas(stage, format, space.slug || "sign-me-out", {
											backgroundColor: board.bg,
										});
									}}
								/>
							</div>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									flashNotice("Unlock this board to download exports")
								}
								className="hidden sm:inline-flex"
							>
								<Download className="size-4" />
								<span className="hidden sm:inline">Export</span>
								<Lock className="size-3 text-ink-faint" />
							</Button>
						))}
					{isHost && !space.isPremium && (
						<UnlockButton
							slug={space.slug}
							amountKobo={unlockPriceKobo}
							onDone={() => router.invalidate()}
							onError={flashNotice}
						/>
					)}
					<Button asChild size="sm" className="hidden sm:inline-flex">
						<Link to="/wear">
							<Shirt className="size-4" />
							<span className="hidden sm:inline">Wear it</span>
						</Link>
					</Button>

					<MoreMenu
						isHost={isHost}
						boardColorId={boardColorId}
						onChangeBoardColor={changeBoardColor}
						locked={locked}
						locking={locking}
						onToggleLock={toggleLock}
						isPremium={space.isPremium}
						onExport={(format) => {
							const stage = canvasRef.current?.getStage();
							if (!stage) return;
							exportCanvas(stage, format, space.slug || "sign-me-out", {
								backgroundColor: board.bg,
							});
						}}
						onLockedExportClick={() =>
							flashNotice("Unlock this board to download exports")
						}
					/>
				</div>
			</header>

			{notice && (
				<div className="glass-pill absolute left-1/2 top-20 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-ink">
					{notice}
				</div>
			)}

			{shareOpen && (
				<ShareDialog
					slug={space.slug}
					title={space.title}
					boardColor={boardColorId}
					onClose={() => setShareOpen(false)}
				/>
			)}

			{tour.active && (
				<SpotlightTour
					steps={buildSpaceTourSteps({
						isHost,
						hasGift: hasGift({
							bankName: space.giftBankName,
							accountNumber: space.giftAccountNumber,
							accountName: space.giftAccountName,
						}),
					})}
					onFinish={tour.dismiss}
					onSkip={tour.dismiss}
				/>
			)}
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
				data-tour="board-color"
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
										? "border-transparent ring-2 ring-marker-blue ring-offset-2 ring-offset-card"
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

type ExportFormat = "png" | "jpg" | "svg" | "pdf";
const EXPORT_FORMATS: {
	id: ExportFormat;
	label: string;
	icon: typeof FileImage;
}[] = [
	{ id: "png", label: "PNG", icon: Image },
	{ id: "jpg", label: "JPG", icon: FileImage },
	{ id: "svg", label: "SVG", icon: FileCode },
	{ id: "pdf", label: "PDF", icon: FileText },
];

/**
 * Mobile-only overflow menu (its trigger is `sm:hidden`) bundling the header
 * actions that don't fit inline on a phone-width screen: board colour, lock,
 * export, and wear it. Desktop keeps each as its own always-visible button —
 * this component renders nothing extra there.
 */
function MoreMenu({
	isHost,
	boardColorId,
	onChangeBoardColor,
	locked,
	locking,
	onToggleLock,
	isPremium,
	onExport,
	onLockedExportClick,
}: {
	isHost: boolean;
	boardColorId: string;
	onChangeBoardColor: (id: string) => void;
	locked: boolean;
	locking: boolean;
	onToggleLock: () => void;
	isPremium: boolean;
	onExport: (format: ExportFormat) => void;
	onLockedExportClick: () => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

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
		<div ref={ref} className="relative sm:hidden">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label="More actions"
			>
				<MoreVertical className="size-4" />
			</Button>
			{open && (
				<div
					role="menu"
					className="paper-card absolute right-0 z-50 mt-2 w-60 rounded-2xl p-2"
				>
					{isHost && (
						<>
							<p className="kicker mb-1.5 px-2 pt-1">Board colour</p>
							<div className="grid grid-cols-6 gap-2 px-2 pb-2">
								{BOARD_COLORS.map((c) => (
									<button
										key={c.id}
										type="button"
										onClick={() => {
											onChangeBoardColor(c.id);
											setOpen(false);
										}}
										title={c.label}
										aria-label={c.label}
										aria-pressed={boardColorId === c.id}
										className={cn(
											"size-7 rounded-full border transition-transform",
											boardColorId === c.id
												? "border-transparent ring-2 ring-marker-blue ring-offset-2 ring-offset-card"
												: "border-line hover:scale-110",
										)}
										style={{ backgroundColor: c.bg }}
									/>
								))}
							</div>

							<div className="my-1 h-px bg-line" />

							<button
								type="button"
								onClick={() => {
									onToggleLock();
									setOpen(false);
								}}
								disabled={locking}
								className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
							>
								{locking ? (
									<Loader2 className="size-4 shrink-0 animate-spin text-ink-soft" />
								) : locked ? (
									<LockOpen className="size-4 shrink-0 text-ink-soft" />
								) : (
									<Lock className="size-4 shrink-0 text-ink-soft" />
								)}
								{locked ? "Unlock signing" : "Lock signing"}
							</button>

							<div className="my-1 h-px bg-line" />

							{isPremium ? (
								<>
									<p className="kicker mb-1 px-2 pt-1">Export as</p>
									{EXPORT_FORMATS.map((f) => (
										<button
											key={f.id}
											type="button"
											onClick={() => {
												onExport(f.id);
												setOpen(false);
											}}
											className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5"
										>
											<f.icon className="size-4 shrink-0 text-ink-soft" />
											{f.label}
										</button>
									))}
								</>
							) : (
								<button
									type="button"
									onClick={() => {
										onLockedExportClick();
										setOpen(false);
									}}
									className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5"
								>
									<Download className="size-4 shrink-0 text-ink-soft" />
									Export
									<Lock className="size-3 text-ink-faint" />
								</button>
							)}

							<div className="my-1 h-px bg-line" />
						</>
					)}

					<Link
						to="/wear"
						onClick={() => setOpen(false)}
						className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5"
					>
						<Shirt className="size-4 shrink-0 text-ink-soft" />
						Wear it
					</Link>
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
