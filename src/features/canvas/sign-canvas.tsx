import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Hand, ImageIcon, Mic, Minus, PenLine, Plus, Type } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Layer, Line, Stage, Transformer } from "react-konva";

import { SignInDialog } from "#/features/auth/sign-in-dialog.tsx";
import { useSessionUser } from "#/features/auth/use-session-user.ts";
import { useMarksStore } from "#/features/canvas/marks-store.ts";
import { loadImageDims, uploadMedia } from "#/features/canvas/media.ts";
import {
	RenderMark,
	type TransformPatch,
} from "#/features/canvas/render-mark.tsx";
import { strokeToFlatPath } from "#/features/canvas/stroke.ts";
import {
	MARKER_COLORS,
	type Mark,
	type MarkerColorId,
	type StrokePoint,
	type ToolId,
} from "#/features/canvas/types.ts";
import { useRealtimeMarks } from "#/features/canvas/use-realtime-marks.ts";
import { cn } from "#/lib/utils.ts";
import { type AddMarkInput, addMark, updateMark } from "#/server/marks.ts";

const TOOLS: { id: ToolId; label: string; icon: typeof PenLine }[] = [
	{ id: "pen", label: "Pen", icon: PenLine },
	{ id: "text", label: "Text", icon: Type },
	{ id: "photo", label: "Photo", icon: ImageIcon },
	{ id: "voice", label: "Voice note", icon: Mic },
	{ id: "move", label: "Move", icon: Hand },
];

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const STROKE_SIZE = 9;
const TEXT_FONT = 30;
const TEXT_WIDTH = 260;
const PHOTO_MAX = 280;
const FONT_MIN = 14;
const FONT_MAX = 96;

type Draft = { x: number; y: number; color: string; points: StrokePoint[] };
type TextDraft = {
	worldX: number;
	worldY: number;
	screenX: number;
	screenY: number;
};

export type SignCanvasProps = {
	space: { id: string; slug: string; status: string };
	initialMarks: Mark[];
	isHost: boolean;
};

export default function SignCanvas({ space, initialMarks }: SignCanvasProps) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<Konva.Stage>(null);
	const draftRef = useRef<Draft | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const trRef = useRef<Konva.Transformer>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const recordStartRef = useRef(0);

	const [size, setSize] = useState({ w: 0, h: 0 });
	const [scale, setScale] = useState(1);
	const [pos, setPos] = useState({ x: 0, y: 0 });
	const [tool, setTool] = useState<ToolId>("pen");
	const [colorId, setColorId] = useState<MarkerColorId>("green");
	const [, tick] = useReducer((n: number) => n + 1, 0);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [signInOpen, setSignInOpen] = useState(false);
	const [recording, setRecording] = useState(false);
	const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
	const [textValue, setTextValue] = useState("");
	const [fontSize, setFontSize] = useState(TEXT_FONT);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const { user, ready } = useSessionUser();
	const { marks, count, upsert, remove } = useMarksStore(initialMarks);
	useRealtimeMarks(space.id, upsert, remove);
	const locked = space.status === "locked";
	const needsAuth = ready && !user;
	const colorHex =
		MARKER_COLORS.find((c) => c.id === colorId)?.value ?? "#15784a";

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Focus the text box AFTER the pointer event resolves — autoFocus fires too
	// early and the canvas's default mousedown focus steals it back, instantly
	// blurring (and discarding) the empty textarea.
	useEffect(() => {
		if (textDraft) requestAnimationFrame(() => textareaRef.current?.focus());
	}, [textDraft]);

	// Selection is only meaningful with the Move tool.
	useEffect(() => {
		if (tool !== "move") setSelectedId(null);
	}, [tool]);

	// Attach the Transformer (bounding box) to the selected node. `marks` is an
	// intentional dependency: re-run after the marks list changes so we re-find
	// the (possibly re-created) selected node.
	// biome-ignore lint/correctness/useExhaustiveDependencies: marks is intentional, see above
	useEffect(() => {
		const tr = trRef.current;
		const stage = stageRef.current;
		if (!tr || !stage) return;
		const node =
			selectedId && tool === "move" ? stage.findOne(`#${selectedId}`) : null;
		tr.nodes(node ? [node] : []);
		tr.getLayer()?.batchDraw();
	}, [selectedId, tool, marks]);

	function worldPoint() {
		return stageRef.current?.getRelativePointerPosition() ?? null;
	}
	function viewportCenter() {
		return { x: (size.w / 2 - pos.x) / scale, y: (size.h / 2 - pos.y) / scale };
	}

	// ---- persistence -------------------------------------------------------
	function optimisticMark(
		over: Partial<Mark> & {
			id: string;
			kind: Mark["kind"];
			x: number;
			y: number;
		},
	): Mark {
		return {
			spaceId: space.id,
			authorId: null,
			authorName: user?.name ?? "You",
			rotation: 0,
			scale: 1,
			z: 0,
			color: null,
			points: null,
			size: null,
			text: null,
			fontSize: null,
			width: null,
			height: null,
			mediaUrl: null,
			caption: null,
			durationMs: null,
			status: "visible",
			createdAt: new Date().toISOString(),
			...over,
		};
	}

	function persist(mark: Mark, input: AddMarkInput) {
		upsert(mark);
		addMark({ data: input })
			.then((saved) => upsert(saved as Mark))
			.catch((err: Error) => {
				remove(mark.id);
				if (err.message.includes("Sign in")) setSignInOpen(true);
				else {
					setSaveError(err.message);
					setTimeout(() => setSaveError(null), 3000);
				}
			});
	}

	// ---- pen ---------------------------------------------------------------
	function startStroke(e: KonvaEventObject<PointerEvent>) {
		if (needsAuth) {
			setSignInOpen(true);
			return;
		}
		const p = worldPoint();
		if (!p) return;
		draftRef.current = {
			x: p.x,
			y: p.y,
			color: colorHex,
			points: [{ x: 0, y: 0, pressure: e.evt.pressure || 0.5 }],
		};
		tick();
	}
	function extendStroke(e: KonvaEventObject<PointerEvent>) {
		const d = draftRef.current;
		if (!d) return;
		const p = worldPoint();
		if (!p) return;
		d.points.push({
			x: p.x - d.x,
			y: p.y - d.y,
			pressure: e.evt.pressure || 0.5,
		});
		tick();
	}
	function endStroke() {
		const d = draftRef.current;
		draftRef.current = null;
		tick();
		if (!d || d.points.length < 2) return;
		const id = crypto.randomUUID();
		persist(
			optimisticMark({
				id,
				kind: "stroke",
				x: d.x,
				y: d.y,
				color: d.color,
				points: d.points,
				size: STROKE_SIZE,
			}),
			{
				id,
				spaceId: space.id,
				kind: "stroke",
				x: d.x,
				y: d.y,
				color: d.color,
				points: d.points,
				size: STROKE_SIZE,
			},
		);
	}

	// ---- text --------------------------------------------------------------
	function startText() {
		if (needsAuth) {
			setSignInOpen(true);
			return;
		}
		const stage = stageRef.current;
		const screen = stage?.getPointerPosition();
		const world = worldPoint();
		if (!screen || !world) return;
		setTextValue("");
		setTextDraft({
			worldX: world.x,
			worldY: world.y,
			screenX: screen.x,
			screenY: screen.y,
		});
	}
	function commitText() {
		const d = textDraft;
		const value = textValue.trim();
		setTextDraft(null);
		setTextValue("");
		if (!d || !value) return;
		const id = crypto.randomUUID();
		persist(
			optimisticMark({
				id,
				kind: "text",
				x: d.worldX,
				y: d.worldY,
				text: value,
				fontSize,
				width: TEXT_WIDTH,
				color: colorHex,
			}),
			{
				id,
				spaceId: space.id,
				kind: "text",
				x: d.worldX,
				y: d.worldY,
				text: value,
				fontSize,
				width: TEXT_WIDTH,
				color: colorHex,
			},
		);
	}

	// ---- photo -------------------------------------------------------------
	function startPhoto() {
		fileInputRef.current?.click();
	}
	async function onPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const id = crypto.randomUUID();
		const ext = file.name.split(".").pop() || "jpg";
		try {
			const url = await uploadMedia(space.id, id, file, ext, file.type);
			const { w, h } = await loadImageDims(url);
			const ratio = Math.min(PHOTO_MAX / w, PHOTO_MAX / h, 1);
			const c = viewportCenter();
			const width = Math.round(w * ratio);
			const height = Math.round(h * ratio);
			persist(
				optimisticMark({
					id,
					kind: "photo",
					x: c.x - width / 2,
					y: c.y - height / 2,
					mediaUrl: url,
					width,
					height,
				}),
				{
					id,
					spaceId: space.id,
					kind: "photo",
					x: c.x - width / 2,
					y: c.y - height / 2,
					mediaUrl: url,
					width,
					height,
				},
			);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : "Upload failed");
			setTimeout(() => setSaveError(null), 3000);
		}
	}

	// ---- voice -------------------------------------------------------------
	async function toggleVoice() {
		if (recording) {
			recorderRef.current?.stop();
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream);
			recorderRef.current = recorder;
			chunksRef.current = [];
			recordStartRef.current = Date.now();
			recorder.ondataavailable = (ev) => chunksRef.current.push(ev.data);
			recorder.onstop = async () => {
				for (const t of stream.getTracks()) t.stop();
				setRecording(false);
				const blob = new Blob(chunksRef.current, { type: "audio/webm" });
				const durationMs = Date.now() - recordStartRef.current;
				const id = crypto.randomUUID();
				try {
					const url = await uploadMedia(
						space.id,
						id,
						blob,
						"webm",
						"audio/webm",
					);
					const c = viewportCenter();
					persist(
						optimisticMark({
							id,
							kind: "voice",
							x: c.x - 75,
							y: c.y - 22,
							mediaUrl: url,
							durationMs,
							color: colorHex,
						}),
						{
							id,
							spaceId: space.id,
							kind: "voice",
							x: c.x - 75,
							y: c.y - 22,
							mediaUrl: url,
							durationMs,
							color: colorHex,
						},
					);
				} catch (err) {
					setSaveError(err instanceof Error ? err.message : "Upload failed");
					setTimeout(() => setSaveError(null), 3000);
				}
			};
			recorder.start();
			setRecording(true);
		} catch {
			setSaveError("Microphone access denied");
			setTimeout(() => setSaveError(null), 3000);
		}
	}

	// ---- pointer dispatch --------------------------------------------------
	function onPointerDown(e: KonvaEventObject<PointerEvent>) {
		if (locked) return;
		if (tool === "pen") startStroke(e);
		else if (tool === "text") startText();
		else if (tool === "move" && e.target === e.target.getStage()) {
			setSelectedId(null); // click empty space to deselect
		}
	}

	// ---- move / transform an existing mark (author/host, enforced server-side)
	function persistTransform(
		id: string,
		patch: { x: number; y: number; rotation?: number; scale?: number },
	) {
		const m = marks.find((mk) => mk.id === id);
		if (!m) return;
		const next = {
			x: patch.x,
			y: patch.y,
			rotation: patch.rotation ?? m.rotation,
			scale: patch.scale ?? m.scale,
		};
		upsert({ ...m, ...next });
		updateMark({ data: { id, ...next } }).catch((err: Error) => {
			upsert(m); // revert
			if (err.message.includes("Sign in")) setSignInOpen(true);
			else {
				setSaveError(err.message);
				setTimeout(() => setSaveError(null), 3000);
			}
		});
	}
	function onMarkDragEnd(id: string, x: number, y: number) {
		persistTransform(id, { x, y });
	}
	function onMarkTransformEnd(id: string, patch: TransformPatch) {
		persistTransform(id, patch);
	}

	const isPanning = tool === "move";
	const draft = draftRef.current;

	return (
		<div ref={wrapRef} className="absolute inset-0 touch-none select-none">
			{size.w > 0 && (
				<Stage
					ref={stageRef}
					width={size.w}
					height={size.h}
					scaleX={scale}
					scaleY={scale}
					x={pos.x}
					y={pos.y}
					draggable={isPanning}
					onWheel={handleWheel}
					onPointerDown={onPointerDown}
					onPointerMove={extendStroke}
					onPointerUp={endStroke}
					onDragEnd={(e) => {
						if (e.target === e.target.getStage()) {
							setPos({ x: e.target.x(), y: e.target.y() });
						}
					}}
					style={{ cursor: isPanning ? "grab" : "crosshair" }}
				>
					<Layer>
						{marks.map((mark) => (
							<RenderMark
								key={mark.id}
								mark={mark}
								draggable={isPanning}
								onDragEnd={onMarkDragEnd}
								onSelect={isPanning ? setSelectedId : undefined}
								onTransformEnd={onMarkTransformEnd}
							/>
						))}
						{draft && (
							<Line
								x={draft.x}
								y={draft.y}
								points={strokeToFlatPath(draft.points, STROKE_SIZE)}
								closed
								fill={draft.color}
								listening={false}
							/>
						)}
						<Transformer
							ref={trRef}
							rotateEnabled
							keepRatio
							enabledAnchors={[
								"top-left",
								"top-right",
								"bottom-left",
								"bottom-right",
							]}
							anchorStroke="#15784a"
							anchorFill="#ffffff"
							anchorCornerRadius={6}
							borderStroke="#15784a"
							borderDash={[4, 4]}
							rotateAnchorOffset={28}
							boundBoxFunc={(oldBox, newBox) =>
								newBox.width < 12 || newBox.height < 12 ? oldBox : newBox
							}
						/>
					</Layer>
				</Stage>
			)}

			{/* text entry overlay */}
			{textDraft && (
				<textarea
					ref={textareaRef}
					value={textValue}
					onChange={(e) => setTextValue(e.target.value)}
					onMouseDown={(e) => e.stopPropagation()}
					onBlur={commitText}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							commitText();
						}
						if (e.key === "Escape") {
							setTextDraft(null);
							setTextValue("");
						}
					}}
					placeholder="type, then Enter"
					className="absolute z-30 min-w-[180px] touch-auto select-text resize-none rounded-md border border-marker-green bg-white/95 px-2 py-1 font-hand text-2xl text-ink shadow-lg outline-none"
					style={{ left: textDraft.screenX, top: textDraft.screenY }}
				/>
			)}

			{/* signing-as chip */}
			<div className="absolute left-4 top-4 z-20">
				{user ? (
					<span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-medium text-ink-soft shadow-sm">
						<span className="size-2 rounded-full bg-marker-green" />
						Signing as {user.name}
					</span>
				) : (
					ready && (
						<button
							type="button"
							onClick={() => setSignInOpen(true)}
							className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-semibold text-marker-green-deep shadow-sm hover:bg-card"
						>
							Sign in to sign
						</button>
					)
				)}
			</div>

			{recording && (
				<div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-marker-pink px-4 py-2 text-sm font-semibold text-white shadow-lg">
					<span className="size-2 animate-pulse rounded-full bg-white" />
					Recording… tap the mic to stop
				</div>
			)}

			{saveError && (
				<div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-line bg-surface-strong px-4 py-2 text-sm font-medium text-ink shadow-lg">
					{saveError}
				</div>
			)}

			{locked && (
				<div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-full border border-line bg-surface-strong px-4 py-2 text-sm font-medium text-ink-soft shadow-sm">
					This space is locked — signing is closed.
				</div>
			)}

			{count === 0 && !draft && (
				<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
					<p className="font-display text-lg font-bold text-ink/55">
						Pick the pen and leave your mark
					</p>
					<p className="scrawl mt-1 text-2xl text-marker-green-deep/60">
						sign right here ✍️
					</p>
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={onPhotoFile}
			/>

			<SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />

			<Dock
				tool={tool}
				recording={recording}
				disabled={locked}
				canSign={!needsAuth}
				colorId={colorId}
				setColorId={setColorId}
				fontSize={fontSize}
				setFontSize={(n) =>
					setFontSize(Math.min(FONT_MAX, Math.max(FONT_MIN, n)))
				}
				onRequireAuth={() => setSignInOpen(true)}
				onPick={(id) => {
					if (id === "photo") startPhoto();
					else if (id === "voice") toggleVoice();
					else setTool(id);
				}}
			/>
		</div>
	);

	function handleWheel(e: KonvaEventObject<WheelEvent>) {
		e.evt.preventDefault();
		const pointer = stageRef.current?.getPointerPosition();
		if (!pointer) return;
		const worldX = (pointer.x - pos.x) / scale;
		const worldY = (pointer.y - pos.y) / scale;
		const factor = 1.08;
		const next = e.evt.deltaY > 0 ? scale / factor : scale * factor;
		const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
		setScale(clamped);
		setPos({
			x: pointer.x - worldX * clamped,
			y: pointer.y - worldY * clamped,
		});
	}
}

function Dock({
	tool,
	recording,
	disabled,
	canSign,
	colorId,
	setColorId,
	fontSize,
	setFontSize,
	onRequireAuth,
	onPick,
}: {
	tool: ToolId;
	recording: boolean;
	disabled?: boolean;
	canSign: boolean;
	colorId: MarkerColorId;
	setColorId: (c: MarkerColorId) => void;
	fontSize: number;
	setFontSize: (n: number) => void;
	onRequireAuth: () => void;
	onPick: (t: ToolId) => void;
}) {
	function pick(id: ToolId) {
		if (id !== "move" && !canSign) {
			onRequireAuth();
			return;
		}
		onPick(id);
	}
	return (
		<div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
			<div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-line bg-surface-strong p-1.5 shadow-lg backdrop-blur-md [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden">
				{tool === "text" && (
					<>
						<span className="flex shrink-0 items-center gap-1 rounded-xl bg-ink/5 px-1.5 py-1">
							<button
								type="button"
								onClick={() => setFontSize(fontSize - 6)}
								title="Smaller text"
								aria-label="Smaller text"
								className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-ink/10 hover:text-ink"
							>
								<Minus className="size-4" />
							</button>
							<span className="min-w-9 text-center text-sm font-semibold tabular-nums text-ink">
								{fontSize}
							</span>
							<button
								type="button"
								onClick={() => setFontSize(fontSize + 6)}
								title="Bigger text"
								aria-label="Bigger text"
								className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-ink/10 hover:text-ink"
							>
								<Plus className="size-4" />
							</button>
						</span>
						<span className="mx-1 h-7 w-px shrink-0 bg-line" />
					</>
				)}
				{TOOLS.map((t) => {
					const active = tool === t.id || (t.id === "voice" && recording);
					return (
						<button
							key={t.id}
							type="button"
							onClick={() => pick(t.id)}
							disabled={disabled && t.id !== "move"}
							title={t.label}
							aria-label={t.label}
							aria-pressed={active}
							className={cn(
								"grid size-9 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-40 sm:size-10",
								active
									? t.id === "voice" && recording
										? "bg-marker-pink text-white"
										: "bg-marker-green-deep text-white"
									: "text-ink-soft hover:bg-ink/5 hover:text-ink",
							)}
						>
							<t.icon className="size-5" />
						</button>
					);
				})}

				<span className="mx-1 h-7 w-px shrink-0 bg-line" />

				{MARKER_COLORS.map((c) => (
					<button
						key={c.id}
						type="button"
						onClick={() => setColorId(c.id)}
						title={`${c.id} marker`}
						aria-label={`${c.id} marker`}
						aria-pressed={colorId === c.id}
						className={cn(
							"grid size-8 shrink-0 place-items-center rounded-full transition-transform sm:size-9",
							colorId === c.id ? "scale-110" : "opacity-80 hover:opacity-100",
						)}
					>
						<span
							className={cn(
								"size-6 rounded-full border-2",
								colorId === c.id ? "border-ink/40" : "border-white",
							)}
							style={{ backgroundColor: c.value }}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
