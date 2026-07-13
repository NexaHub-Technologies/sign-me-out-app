import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
	Hand,
	Mic,
	Minus,
	PenLine,
	Plus,
	Redo2,
	Trash2,
	Type,
	Undo2,
} from "lucide-react";
import {
	type CSSProperties,
	forwardRef,
	useEffect,
	useImperativeHandle,
	useReducer,
	useRef,
	useState,
} from "react";
import { Layer, Line, Stage, Transformer } from "react-konva";

import { SignInDialog } from "#/features/auth/sign-in-dialog.tsx";
import { useSessionUser } from "#/features/auth/use-session-user.ts";
import { useMarksStore } from "#/features/canvas/marks-store.ts";
import { uploadVoice } from "#/features/canvas/media.ts";
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
import { SealedBanner } from "#/features/reveal/sealed-banner.tsx";
import { cn } from "#/lib/utils.ts";
import {
	type AddMarkInput,
	addMark,
	removeMark,
	restoreMark,
	updateMark,
} from "#/server/marks.ts";

// Keep firing stage touch events while the stage is being dragged — otherwise a
// pinch that starts during a one-finger pan (Move tool) never reaches
// handlePinch, because Konva suppresses events on a dragging node by default.
Konva.hitOnDragEnabled = true;

const TOOLS: { id: ToolId; label: string; icon: typeof PenLine }[] = [
	{ id: "move", label: "Move & zoom", icon: Hand },
	{ id: "pen", label: "Pen", icon: PenLine },
	{ id: "text", label: "Text", icon: Type },
	{ id: "voice", label: "Voice note", icon: Mic },
];

const ZOOM_STEP = 1.25;

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const STROKE_SIZE = 9;
const TEXT_FONT = 30;
const TEXT_WIDTH = 260;
const FONT_MIN = 14;
const FONT_MAX = 96;

type Draft = { x: number; y: number; color: string; points: StrokePoint[] };
type TextDraft = {
	worldX: number;
	worldY: number;
	screenX: number;
	screenY: number;
};
type Transform = { x: number; y: number; rotation: number; scale: number };
// One reversible step the current user took this session. "add" undoes by
// removing the mark; "transform" undoes by restoring its prior placement;
// "remove" undoes by restoring the deleted mark (snapshot carried so we can
// re-add it locally).
type UndoEntry =
	| { id: string; kind: "add"; markId: string }
	| { id: string; kind: "transform"; markId: string; before: Transform }
	| { id: string; kind: "remove"; mark: Mark };
// The inverse of an undone step, so it can be re-applied. "add" restores the
// removed mark; "transform" re-applies the placement undo reverted; "remove"
// deletes the mark again.
type RedoEntry =
	| { id: string; kind: "add"; mark: Mark }
	| { id: string; kind: "transform"; markId: string; after: Transform }
	| { id: string; kind: "remove"; markId: string };

export type SignCanvasProps = {
	space: {
		id: string;
		slug: string;
		status: string;
		revealAt: string | null;
	};
	initialMarks: Mark[];
	isHost: boolean;
	/** True for a non-host viewing a still-sealed capsule (board withheld). */
	sealed: boolean;
};

export type SignCanvasHandle = {
	getStage: () => Konva.Stage | null;
};

const SignCanvas = forwardRef<SignCanvasHandle, SignCanvasProps>(
	function SignCanvas({ space, initialMarks, isHost, sealed }, ref) {
		const wrapRef = useRef<HTMLDivElement>(null);
		const stageRef = useRef<Konva.Stage>(null);
		const draftRef = useRef<Draft | null>(null);
		const pinchRef = useRef<{
			dist: number;
			center: { x: number; y: number };
		} | null>(null);
		// True from the moment a second finger lands until the next single-finger
		// gesture begins, so pointer-up handlers don't treat a pinch as a tap.
		const multiTouchRef = useRef(false);
		const textareaRef = useRef<HTMLTextAreaElement>(null);
		const textWasOpenRef = useRef(false);
		const textOpenedAtRef = useRef(0);
		const trRef = useRef<Konva.Transformer>(null);
		const recorderRef = useRef<MediaRecorder | null>(null);
		const chunksRef = useRef<Blob[]>([]);
		const recordStartRef = useRef(0);
		// In-flight add saves, so undo can wait for the row to exist before deleting it.
		const pendingRef = useRef<Map<string, Promise<unknown>>>(new Map());

		useImperativeHandle(ref, () => ({
			getStage: () => stageRef.current,
		}));

		const [size, setSize] = useState({ w: 0, h: 0 });
		const [scale, setScale] = useState(1);
		const [pos, setPos] = useState({ x: 0, y: 0 });
		const [tool, setTool] = useState<ToolId>("move");
		const [colorId, setColorId] = useState<MarkerColorId>("blue");
		const [, tick] = useReducer((n: number) => n + 1, 0);
		const [saveError, setSaveError] = useState<string | null>(null);
		const [signInOpen, setSignInOpen] = useState(false);
		const [recording, setRecording] = useState(false);
		const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
		const [textValue, setTextValue] = useState("");
		const [fontSize, setFontSize] = useState(TEXT_FONT);
		const [selectedId, setSelectedId] = useState<string | null>(null);
		const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
		const [redoStack, setRedoStack] = useState<RedoEntry[]>([]);

		const { user, ready } = useSessionUser();
		const { marks, count, upsert, remove } = useMarksStore(initialMarks);
		// A sealed capsule mustn't stream other people's marks to a signer —
		// keep the subscription off until it opens.
		useRealtimeMarks(space.id, upsert, remove, !sealed);
		const locked = space.status === "locked";
		const needsAuth = ready && !user;

		const colorHex =
			MARKER_COLORS.find((c) => c.id === colorId)?.value ?? "#2f6be6";

		useEffect(() => {
			const el = wrapRef.current;
			if (!el) return;
			const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
			measure();
			const ro = new ResizeObserver(measure);
			ro.observe(el);
			return () => ro.disconnect();
		}, []);

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
			return {
				x: (size.w / 2 - pos.x) / scale,
				y: (size.h / 2 - pos.y) / scale,
			};
		}
		// Step zoom (the dock +/- buttons), keeping the viewport center fixed.
		function zoomBy(factor: number) {
			const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
			const cx = size.w / 2;
			const cy = size.h / 2;
			const worldX = (cx - pos.x) / scale;
			const worldY = (cy - pos.y) / scale;
			setScale(next);
			setPos({ x: cx - worldX * next, y: cy - worldY * next });
		}

		function flashError(message: string) {
			setSaveError(message);
			setTimeout(() => setSaveError(null), 3000);
		}

		// ---- undo / redo -------------------------------------------------------
		// A fresh action records an undo step and invalidates any redo history.
		function recordAction(entry: UndoEntry) {
			setUndoStack((prev) => [...prev, entry]);
			setRedoStack([]);
		}
		function dropUndoEntry(entryId: string) {
			setUndoStack((prev) => prev.filter((e) => e.id !== entryId));
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
			const entryId = crypto.randomUUID();
			const save = addMark({ data: input })
				.then((saved) => upsert(saved as Mark))
				.catch((err: Error) => {
					remove(mark.id);
					dropUndoEntry(entryId); // nothing to undo if it never saved
					if (err.message.includes("Sign in")) setSignInOpen(true);
					else flashError(err.message);
				})
				.finally(() => pendingRef.current.delete(mark.id));
			pendingRef.current.set(mark.id, save);
			recordAction({ id: entryId, kind: "add", markId: mark.id });
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
			textOpenedAtRef.current = Date.now();
			// Move it to the tap point and focus synchronously, still inside the tap
			// gesture, so the mobile keyboard opens. The textarea is always mounted
			// (parked off-screen) so the ref is ready; positioning before focus avoids
			// focusing an off-screen field. React re-applies the same left/top on the
			// next render, so there's no conflict.
			const ta = textareaRef.current;
			if (ta) {
				ta.style.left = `${screen.x}px`;
				ta.style.top = `${screen.y}px`;
				ta.focus();
			}
		}
		// Mobile fires a spurious blur right after the box opens (the trailing
		// synthetic click / focus race). Swallow it — keep the empty box open and
		// re-assert focus — so it doesn't commit-empty and vanish. After a short
		// window, blur means the user really left, so commit/dismiss normally.
		function onTextBlur() {
			if (Date.now() - textOpenedAtRef.current < 500 && !textValue.trim()) {
				textareaRef.current?.focus();
				return;
			}
			commitText();
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

		// ---- voice -------------------------------------------------------------
		async function toggleVoice() {
			if (recording) {
				recorderRef.current?.stop();
				return;
			}
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
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
						// voice notes go to the private bucket; `url` here is a storage
						// path, resolved to a signed URL server-side at playback time
						const url = await uploadVoice(space.id, id, blob);
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
								// so the creator can play their own clip before the row saves
								authorId: user?.id ?? null,
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
			// A second finger turns the gesture into navigation (pinch zoom/pan):
			// cancel any partial stroke — never commit it — and stop treating the
			// touch as a tool action until every finger lifts.
			if (e.evt.pointerType === "touch" && !e.evt.isPrimary) {
				multiTouchRef.current = true;
				draftRef.current = null;
				tick();
				return;
			}
			multiTouchRef.current = false;
			// Remember whether a text box was open as the tap began: tapping the canvas
			// blurs (commits) it, so by pointer-up textDraft is already null — this lets
			// us tell "commit the open box" from "place a new one".
			textWasOpenRef.current = textDraft !== null;
			if (locked) return;
			if (tool === "pen") startStroke(e);
			else if (tool === "move" && e.target === e.target.getStage()) {
				setSelectedId(null); // click empty space to deselect
			}
		}

		function onPointerUp() {
			// Fingers lifting off a pinch are not taps — don't commit a stroke or
			// spawn a text box. (Fires once per finger, so don't reset the flag here;
			// the next primary pointer-down does.)
			if (multiTouchRef.current) return;
			endStroke();
			// Create the text box on tap-up so focus() lands inside the gesture (mobile
			// keyboard). Skip if this tap was just dismissing an already-open box.
			if (tool === "text" && !textWasOpenRef.current && textDraft === null) {
				startText();
			}
		}

		// ---- move / transform an existing mark (author/host, enforced server-side)
		function persistTransform(
			id: string,
			patch: { x: number; y: number; rotation?: number; scale?: number },
		) {
			const m = marks.find((mk) => mk.id === id);
			if (!m) return;
			const before: Transform = {
				x: m.x,
				y: m.y,
				rotation: m.rotation ?? 0,
				scale: m.scale ?? 1,
			};
			const next = {
				x: patch.x,
				y: patch.y,
				rotation: patch.rotation ?? m.rotation,
				scale: patch.scale ?? m.scale,
			};
			const entryId = crypto.randomUUID();
			upsert({ ...m, ...next });
			recordAction({ id: entryId, kind: "transform", markId: id, before });
			updateMark({ data: { id, ...next } }).catch((err: Error) => {
				upsert(m); // revert
				dropUndoEntry(entryId); // the move never landed
				if (err.message.includes("Sign in")) setSignInOpen(true);
				else flashError(err.message);
			});
		}
		function onMarkDragEnd(id: string, x: number, y: number) {
			persistTransform(id, { x, y });
		}
		function onMarkTransformEnd(id: string, patch: TransformPatch) {
			persistTransform(id, patch);
		}

		// ---- delete (author/host, enforced server-side) ----------------------
		// Soft-delete the mark and record it for undo. The realtime echo of the
		// hidden-status update removes it for other viewers too.
		function deleteMark(id: string) {
			const snapshot = marks.find((mk) => mk.id === id);
			if (!snapshot) return;
			const entryId = crypto.randomUUID();
			setSelectedId(null);
			remove(id);
			recordAction({ id: entryId, kind: "remove", mark: snapshot });
			removeMark({ data: { id } }).catch((err: Error) => {
				upsert(snapshot); // couldn't delete — put it back
				dropUndoEntry(entryId);
				if (err.message.includes("Sign in")) setSignInOpen(true);
				else flashError(err.message);
			});
		}

		function pushRedo(entry: RedoEntry) {
			setRedoStack((prev) => [...prev, entry]);
		}

		// Reverse the most recent step the user took this session. Adds are removed
		// (author-gated server-side, which we satisfy); transforms are restored to
		// their prior placement. Each step records its inverse for redo.
		function undo() {
			const entry = undoStack[undoStack.length - 1];
			if (!entry) return;
			setUndoStack((prev) => prev.slice(0, -1));
			const affectedId = entry.kind === "remove" ? entry.mark.id : entry.markId;
			if (selectedId === affectedId) setSelectedId(null);

			if (entry.kind === "remove") {
				// undo a delete: bring the mark back (flip status, don't re-insert).
				upsert(entry.mark);
				pushRedo({ id: entry.id, kind: "remove", markId: entry.mark.id });
				restoreMark({ data: { id: entry.mark.id } }).catch((err: Error) => {
					remove(entry.mark.id);
					flashError(err.message);
				});
				return;
			}

			if (entry.kind === "add") {
				const snapshot = marks.find((mk) => mk.id === entry.markId);
				if (snapshot) pushRedo({ id: entry.id, kind: "add", mark: snapshot });
				remove(entry.markId);
				// If the insert is still in flight, wait for it so the row exists, then
				// soft-delete it. Restore locally if the server refuses.
				const pending = pendingRef.current.get(entry.markId);
				const run = pending
					? pending.then(() => removeMark({ data: { id: entry.markId } }))
					: removeMark({ data: { id: entry.markId } });
				run.catch((err: Error) => {
					if (snapshot) upsert(snapshot);
					flashError(err.message);
				});
				return;
			}

			// transform: put the mark back where it was before the move/resize.
			const m = marks.find((mk) => mk.id === entry.markId);
			if (!m) return;
			pushRedo({
				id: entry.id,
				kind: "transform",
				markId: entry.markId,
				after: {
					x: m.x,
					y: m.y,
					rotation: m.rotation ?? 0,
					scale: m.scale ?? 1,
				},
			});
			upsert({ ...m, ...entry.before });
			updateMark({ data: { id: entry.markId, ...entry.before } }).catch(
				(err: Error) => {
					upsert(m); // couldn't undo — leave it where it was
					flashError(err.message);
				},
			);
		}

		function pushUndoBack(entry: UndoEntry) {
			setUndoStack((prev) => [...prev, entry]);
		}

		// Re-apply the most recently undone step, and record it on the undo stack
		// again so it can be undone once more.
		function redo() {
			const entry = redoStack[redoStack.length - 1];
			if (!entry) return;
			setRedoStack((prev) => prev.slice(0, -1));

			if (entry.kind === "remove") {
				// redo a delete: soft-delete the mark again.
				const snapshot = marks.find((mk) => mk.id === entry.markId);
				if (!snapshot) return;
				if (selectedId === entry.markId) setSelectedId(null);
				remove(entry.markId);
				pushUndoBack({ id: entry.id, kind: "remove", mark: snapshot });
				removeMark({ data: { id: entry.markId } }).catch((err: Error) => {
					upsert(snapshot);
					flashError(err.message);
				});
				return;
			}

			if (entry.kind === "add") {
				// Bring the soft-deleted mark back (flip status, don't re-insert).
				upsert(entry.mark);
				pushUndoBack({ id: entry.id, kind: "add", markId: entry.mark.id });
				restoreMark({ data: { id: entry.mark.id } }).catch((err: Error) => {
					remove(entry.mark.id);
					flashError(err.message);
				});
				return;
			}

			// transform: re-apply the placement undo had reverted.
			const m = marks.find((mk) => mk.id === entry.markId);
			if (!m) return;
			const before: Transform = {
				x: m.x,
				y: m.y,
				rotation: m.rotation ?? 0,
				scale: m.scale ?? 1,
			};
			pushUndoBack({
				id: entry.id,
				kind: "transform",
				markId: entry.markId,
				before,
			});
			upsert({ ...m, ...entry.after });
			updateMark({ data: { id: entry.markId, ...entry.after } }).catch(
				(err: Error) => {
					upsert(m);
					flashError(err.message);
				},
			);
		}

		// Undo/redo shortcuts anywhere on the canvas (Ctrl/Cmd+Z, +Shift for redo,
		// plus Ctrl+Y). Bind once; call the latest handlers via refs so the listener
		// doesn't churn on every render.
		const undoRef = useRef(undo);
		undoRef.current = undo;
		const redoRef = useRef(redo);
		redoRef.current = redo;
		const deleteRef = useRef(deleteSelected);
		deleteRef.current = deleteSelected;
		useEffect(() => {
			function onKey(e: KeyboardEvent) {
				// Never hijack keys while typing in the text box.
				const tag = (e.target as HTMLElement | null)?.tagName;
				const typing = tag === "TEXTAREA" || tag === "INPUT";
				// Delete / Backspace removes the selected object.
				if (!typing && (e.key === "Delete" || e.key === "Backspace")) {
					e.preventDefault(); // also stops Backspace from navigating back
					deleteRef.current();
					return;
				}
				if (!(e.metaKey || e.ctrlKey)) return;
				const key = e.key.toLowerCase();
				const isRedo = (key === "z" && e.shiftKey) || key === "y";
				const isUndo = key === "z" && !e.shiftKey;
				if (!isUndo && !isRedo) return;
				// Let the browser handle undo/redo inside the text box being typed in.
				if (typing) return;
				e.preventDefault();
				if (isRedo) redoRef.current();
				else undoRef.current();
			}
			window.addEventListener("keydown", onKey);
			return () => window.removeEventListener("keydown", onKey);
		}, []);

		// A selected mark can be deleted by its author or the host (server enforces
		// this too). Host may delete any object, for moderation.
		const selectedMark = selectedId
			? marks.find((m) => m.id === selectedId)
			: undefined;
		const canDelete =
			!!selectedMark &&
			tool === "move" &&
			(isHost ||
				(selectedMark.authorId != null && selectedMark.authorId === user?.id));
		function deleteSelected() {
			if (canDelete && selectedId) deleteMark(selectedId);
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
						onPointerUp={onPointerUp}
						onTouchMove={handlePinch}
						onTouchEnd={endPinch}
						onDragEnd={(e) => {
							if (e.target === e.target.getStage()) {
								setPos({ x: e.target.x(), y: e.target.y() });
							}
						}}
						style={{
							cursor: tool === "move" ? "grab" : "crosshair",
						}}
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
									viewerId={user?.id ?? null}
									isHost={isHost}
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
								anchorStroke="#1d4ed8"
								anchorFill="#ffffff"
								anchorCornerRadius={6}
								borderStroke="#1d4ed8"
								borderDash={[4, 4]}
								rotateAnchorOffset={28}
								boundBoxFunc={(oldBox, newBox) =>
									newBox.width < 12 || newBox.height < 12 ? oldBox : newBox
								}
							/>
						</Layer>
					</Stage>
				)}

				{/* Text entry overlay — always mounted (parked off-screen when idle) so
			    we can focus it synchronously inside the tap gesture on mobile. */}
				<textarea
					ref={textareaRef}
					value={textValue}
					onChange={(e) => setTextValue(e.target.value)}
					onMouseDown={(e) => e.stopPropagation()}
					onTouchStart={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					onBlur={onTextBlur}
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
					className={cn(
						"absolute z-30 min-w-[180px] touch-auto select-text resize-none rounded-md border border-marker-blue bg-white/95 px-2 py-1 font-hand text-2xl text-ink shadow-lg outline-none",
						!textDraft && "pointer-events-none",
					)}
					style={{
						left: textDraft ? textDraft.screenX : -9999,
						top: textDraft ? textDraft.screenY : -9999,
					}}
				/>

				{/* signing-as chip — pinned to the board like a name tag */}
				<div className="absolute left-4 top-20 z-20 max-w-[42vw]">
					{user ? (
						<span
							style={{ "--rot": "-2deg" } as CSSProperties}
							className="glass-pill pin relative inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft"
						>
							<span className="size-2 shrink-0 rounded-full bg-marker-blue" />
							<span className="min-w-0 truncate">Signing as {user.name}</span>
						</span>
					) : (
						ready && (
							<button
								type="button"
								onClick={() => setSignInOpen(true)}
								style={{ "--rot": "-2deg" } as CSSProperties}
								className="glass-pill pin relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-marker-blue-deep hover:bg-card"
							>
								Sign in to sign
							</button>
						)
					)}
				</div>

				{recording && (
					<div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-marker-pink px-4 py-2 text-sm font-semibold text-white shadow-lg">
						<span className="size-2 animate-pulse rounded-full bg-white" />
						Recording… tap the mic to stop
					</div>
				)}

				{saveError && (
					<div className="glass-pill absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-ink">
						{saveError}
					</div>
				)}

				{locked && (
					<div className="glass-pill absolute left-1/2 top-32 z-20 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-ink-soft">
						This space is locked — signing is closed.
					</div>
				)}

				{space.revealAt &&
					new Date(space.revealAt).getTime() > Date.now() &&
					(sealed || isHost) && (
						<SealedBanner revealAt={space.revealAt} hostPreview={isHost} />
					)}

				{count === 0 && !draft && (
					<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
						<p className="font-display text-lg font-bold text-ink/55">
							Pick the pen and leave your mark
						</p>
						<p className="scrawl mt-1 text-2xl text-marker-blue-deep/60">
							sign right here ✍️
						</p>
					</div>
				)}

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
					scale={scale}
					onZoom={zoomBy}
					onZoomReset={() => zoomBy(1 / scale)}
					canUndo={undoStack.length > 0}
					onUndo={undo}
					canRedo={redoStack.length > 0}
					onRedo={redo}
					canDelete={canDelete}
					onDelete={deleteSelected}
					onRequireAuth={() => setSignInOpen(true)}
					onPick={(id) => {
						if (id === "voice") toggleVoice();
						else setTool(id);
					}}
				/>
			</div>
		);

		// Pinch-to-zoom (two fingers). We mutate the stage directly for smooth, lag-
		// free zoom during the gesture, then commit the final scale/position to React
		// state on touch-end so it stays the source of truth between gestures.
		function handlePinch(e: KonvaEventObject<TouchEvent>) {
			const touches = e.evt.touches;
			if (touches.length < 2) return;
			e.evt.preventDefault();
			const stage = stageRef.current;
			if (!stage) return;
			if (stage.isDragging()) stage.stopDrag();
			multiTouchRef.current = true;
			draftRef.current = null; // a two-finger gesture is a zoom, not a stroke

			const rect = stage.container().getBoundingClientRect();
			const t1 = touches[0];
			const t2 = touches[1];
			const p1 = { x: t1.clientX - rect.left, y: t1.clientY - rect.top };
			const p2 = { x: t2.clientX - rect.left, y: t2.clientY - rect.top };
			const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
			const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

			const prev = pinchRef.current;
			if (!prev) {
				pinchRef.current = { dist, center };
				return;
			}

			const curScale = stage.scaleX();
			const worldX = (center.x - stage.x()) / curScale;
			const worldY = (center.y - stage.y()) / curScale;
			const nextScale = Math.min(
				MAX_SCALE,
				Math.max(MIN_SCALE, curScale * (dist / prev.dist)),
			);
			// Keep the world point under the fingers fixed, and follow finger panning.
			const dx = center.x - prev.center.x;
			const dy = center.y - prev.center.y;
			const nextPos = {
				x: center.x - worldX * nextScale + dx,
				y: center.y - worldY * nextScale + dy,
			};
			stage.scale({ x: nextScale, y: nextScale });
			stage.position(nextPos);
			stage.batchDraw();
			// Mirror into React state every move too: with the Move tool the stage is
			// draggable, so starting a pinch fires stopDrag -> onDragEnd -> a re-render
			// mid-gesture. If state lagged, that render would reset scaleX and the zoom
			// would snap back. Computing from the live stage keeps this in sync.
			setScale(nextScale);
			setPos(nextPos);
			pinchRef.current = { dist, center };
		}

		function endPinch(e: KonvaEventObject<TouchEvent>) {
			if (!pinchRef.current || e.evt.touches.length >= 2) return;
			pinchRef.current = null;
			const stage = stageRef.current;
			if (!stage) return;
			setScale(stage.scaleX());
			setPos({ x: stage.x(), y: stage.y() });
		}

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
	},
);

export default SignCanvas;

function Dock({
	tool,
	recording,
	disabled,
	canSign,
	colorId,
	setColorId,
	fontSize,
	setFontSize,
	scale,
	onZoom,
	onZoomReset,
	canUndo,
	onUndo,
	canRedo,
	onRedo,
	canDelete,
	onDelete,
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
	scale: number;
	onZoom: (factor: number) => void;
	onZoomReset: () => void;
	canUndo: boolean;
	onUndo: () => void;
	canRedo: boolean;
	onRedo: () => void;
	canDelete: boolean;
	onDelete: () => void;
	onRequireAuth: () => void;
	onPick: (t: ToolId) => void;
}) {
	// Move is a navigation tool — usable without signing in or when locked.
	const FREE_TOOLS: ToolId[] = ["move"];
	function pick(id: ToolId) {
		if (!FREE_TOOLS.includes(id) && !canSign) {
			onRequireAuth();
			return;
		}
		onPick(id);
	}
	const activeColor =
		MARKER_COLORS.find((c) => c.id === colorId)?.value ?? "#2f6be6";
	const [colorOpen, setColorOpen] = useState(false);
	const colorRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!colorOpen) return;
		function onDown(e: MouseEvent) {
			if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
				setColorOpen(false);
			}
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setColorOpen(false);
		}
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [colorOpen]);
	return (
		<div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
			<div className="relative flex max-w-full justify-center">
				{/* a soft bloom of the current ink colour, glowing up through the tray */}
				<div
					aria-hidden
					className="pointer-events-none absolute -bottom-4 h-14 w-56 rounded-full opacity-70 blur-xl transition-colors duration-300"
					style={{
						background: `radial-gradient(closest-side, ${activeColor}4d, transparent 72%)`,
					}}
				/>
				<div className="paper-card relative flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl p-1.5">
					{/* the tray's latch — a small nub, like a pencil case clasp */}
					<span
						aria-hidden
						className="absolute -top-1.5 left-1/2 h-2.5 w-8 -translate-x-1/2 rounded-b-md border border-t-0 border-line bg-surface-strong"
					/>
					<button
						type="button"
						onClick={onUndo}
						disabled={!canUndo}
						title="Undo (Ctrl+Z)"
						aria-label="Undo"
						className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent sm:size-10"
					>
						<Undo2 className="size-5" />
					</button>
					<button
						type="button"
						onClick={onRedo}
						disabled={!canRedo}
						title="Redo (Ctrl+Shift+Z)"
						aria-label="Redo"
						className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent sm:size-10"
					>
						<Redo2 className="size-5" />
					</button>
					<span className="mx-1 hidden h-7 w-px shrink-0 bg-line sm:block" />
					{/* contextual stepper — floats above the tray like the colour picker,
					    so it never widens the dock row on small screens */}
					{tool === "text" && (
						<div className="glass-pill absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5">
							<button
								type="button"
								onClick={() => setFontSize(fontSize - 6)}
								title="Smaller text"
								aria-label="Smaller text"
								className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-ink/10 hover:text-ink"
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
								className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-ink/10 hover:text-ink"
							>
								<Plus className="size-4" />
							</button>
						</div>
					)}
					{tool === "move" && (
						<div className="glass-pill absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5">
							<button
								type="button"
								onClick={() => onZoom(1 / ZOOM_STEP)}
								title="Zoom out"
								aria-label="Zoom out"
								className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-ink/10 hover:text-ink"
							>
								<Minus className="size-4" />
							</button>
							<button
								type="button"
								onClick={onZoomReset}
								title="Reset zoom"
								aria-label="Reset zoom to 100%"
								className="min-w-12 rounded-full px-1 text-center text-sm font-semibold tabular-nums text-ink hover:bg-ink/10"
							>
								{Math.round(scale * 100)}%
							</button>
							<button
								type="button"
								onClick={() => onZoom(ZOOM_STEP)}
								title="Zoom in"
								aria-label="Zoom in"
								className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-ink/10 hover:text-ink"
							>
								<Plus className="size-4" />
							</button>
						</div>
					)}
					{TOOLS.map((t) => {
						const active = tool === t.id || (t.id === "voice" && recording);
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => pick(t.id)}
								disabled={disabled && !FREE_TOOLS.includes(t.id)}
								title={t.label}
								aria-label={t.label}
								aria-pressed={active}
								className={cn(
									"relative grid size-9 shrink-0 place-items-center rounded-xl transition-all disabled:opacity-40 sm:size-10",
									active
										? cn(
												"-translate-y-1 text-white shadow-md after:absolute after:-top-1 after:left-1/2 after:h-1 after:w-3 after:-translate-x-1/2 after:rounded-full after:bg-black/15",
												t.id === "voice" && recording
													? "bg-marker-pink"
													: "bg-gradient-to-b from-marker-blue to-marker-blue-deep",
											)
										: "text-ink-soft hover:bg-ink/5 hover:text-ink",
								)}
							>
								<t.icon className="size-5" />
							</button>
						);
					})}

					<span className="mx-1 hidden h-7 w-px shrink-0 bg-line sm:block" />

					{/* current ink, tucked into a compact swatch — tap to open the tray */}
					<div ref={colorRef} className="relative shrink-0">
						<button
							type="button"
							onClick={() => setColorOpen((v) => !v)}
							title="Marker colour"
							aria-label="Marker colour"
							aria-haspopup="menu"
							aria-expanded={colorOpen}
							className="grid size-9 place-items-center rounded-xl transition-colors hover:bg-ink/5 sm:size-10"
						>
							<span
								className="block size-5 shrink-0 rotate-45 rounded-[50%_50%_50%_0] border-2 border-white shadow-sm sm:size-6"
								style={{ backgroundColor: activeColor }}
							/>
						</button>
						{colorOpen && (
							<div
								role="menu"
								className="glass-pill absolute bottom-full right-0 mb-2 flex items-center gap-2.5 rounded-full px-3.5 py-2.5"
							>
								{MARKER_COLORS.map((c) => (
									<button
										key={c.id}
										type="button"
										onClick={() => {
											setColorId(c.id);
											setColorOpen(false);
										}}
										title={`${c.id} marker`}
										aria-label={`${c.id} marker`}
										aria-pressed={colorId === c.id}
										className={cn(
											"grid place-items-center transition-transform",
											colorId === c.id
												? "scale-110"
												: "opacity-80 hover:opacity-100",
										)}
									>
										<span
											className={cn(
												"block size-6 rotate-45 rounded-[50%_50%_50%_0] border-2",
												colorId === c.id ? "border-ink/40" : "border-white",
											)}
											style={{ backgroundColor: c.value }}
										/>
									</button>
								))}
							</div>
						)}
					</div>

					{canDelete && (
						<>
							<span className="mx-1 hidden h-7 w-px shrink-0 bg-line sm:block" />
							<button
								type="button"
								onClick={onDelete}
								title="Delete selected"
								aria-label="Delete selected"
								className="grid size-9 shrink-0 place-items-center rounded-xl text-marker-pink transition-colors hover:bg-marker-pink/10 sm:size-10"
							>
								<Trash2 className="size-5" />
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
