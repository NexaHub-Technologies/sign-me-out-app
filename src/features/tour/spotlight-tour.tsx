import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

import { Button } from "#/components/ui/button.tsx";

export type TourStep = {
	id: string;
	/** CSS selector for the spotlit element; null = centered card over a full scrim. */
	target: string | null;
	title: string;
	/** One copy for everyone, or per-pointer copy (touch chosen on coarse pointers). */
	body: string | { mouse: string; touch: string };
	/** Which side of the target the coach card sits on. Default "bottom". */
	placement?: "top" | "bottom" | "left" | "right" | "center";
	/** Extra px of breathing room around the cut-out. Default 8. */
	padding?: number;
};

type Box = { top: number; left: number; width: number; height: number };

const HOLE_PAD = 8;
const CARD_GAP = 12;
const EDGE = 12;
/** How long to wait for a step's target to appear before falling back to a centered card. */
const TARGET_WAIT_MS = 600;

const clamp = (v: number, lo: number, hi: number) =>
	Math.min(Math.max(v, lo), hi);
const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
const sameBox = (a: Box, b: Box) =>
	near(a.top, b.top) &&
	near(a.left, b.left) &&
	near(a.width, b.width) &&
	near(a.height, b.height);

/**
 * A passive spotlight walkthrough: an ink scrim with a rounded cut-out that
 * glides between targets, plus a paper coach card with Back / Next / Skip.
 * The overlay swallows every pointer event, so the app underneath can't be
 * poked mid-tour. The cut-out is one div whose giant box-shadow paints the
 * scrim — animating the div animates the hole for free.
 */
export function SpotlightTour({
	steps,
	onFinish,
	onSkip,
}: {
	steps: TourStep[];
	onFinish: () => void;
	onSkip: () => void;
}) {
	const [index, setIndex] = useState(0);
	// null = no target for this step (yet) — full scrim, centered card.
	const [hole, setHole] = useState<Box | null>(null);
	const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(
		null,
	);
	const targetRef = useRef<Element | null>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const nextRef = useRef<HTMLButtonElement>(null);
	const [coarse] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(pointer: coarse)").matches,
	);

	const step = steps[index];
	const last = index === steps.length - 1;

	const measure = useCallback(() => {
		const el = targetRef.current;
		if (!el || !el.isConnected) {
			// Target vanished mid-step (popover closed, card collapsed) — degrade
			// gracefully to the centered layout rather than spotlighting nothing.
			if (el) {
				targetRef.current = null;
				setHole(null);
			}
			return;
		}
		const pad = step.padding ?? HOLE_PAD;
		const r = el.getBoundingClientRect();
		const next: Box = {
			top: r.top - pad,
			left: r.left - pad,
			width: r.width + pad * 2,
			height: r.height + pad * 2,
		};
		setHole((prev) => (prev && sameBox(prev, next) ? prev : next));
	}, [step.padding]);

	// Resolve the current step's target, waiting briefly for lazy-mounted UI.
	useEffect(() => {
		let cancelled = false;
		const started = Date.now();
		function resolve() {
			if (cancelled) return;
			const el = step.target ? document.querySelector(step.target) : null;
			if (el) {
				targetRef.current = el;
				measure();
			} else if (step.target && Date.now() - started < TARGET_WAIT_MS) {
				setTimeout(resolve, 100);
			} else {
				targetRef.current = null;
				setHole(null);
			}
		}
		resolve();
		return () => {
			cancelled = true;
		};
	}, [step.target, measure]);

	// Keep the hole glued to its target: resize/rotation, plus a light interval
	// for layout shifts we can't observe (fonts, pills expanding, dock steppers).
	useEffect(() => {
		const tick = setInterval(measure, 250);
		window.addEventListener("resize", measure);
		window.addEventListener("orientationchange", measure);
		return () => {
			clearInterval(tick);
			window.removeEventListener("resize", measure);
			window.removeEventListener("orientationchange", measure);
		};
	}, [measure]);

	// Place the coach card beside the hole, clamped fully on-screen.
	// biome-ignore lint/correctness/useExhaustiveDependencies: index re-runs after the card re-renders with new copy (its size changes)
	useLayoutEffect(() => {
		const card = cardRef.current;
		if (!card) return;
		const cw = card.offsetWidth;
		const ch = card.offsetHeight;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const placement = hole ? (step.placement ?? "bottom") : "center";
		let top = (vh - ch) / 2;
		let left = (vw - cw) / 2;
		if (hole && placement !== "center") {
			if (placement === "top") {
				top = hole.top - ch - CARD_GAP;
				left = hole.left + hole.width / 2 - cw / 2;
			} else if (placement === "bottom") {
				top = hole.top + hole.height + CARD_GAP;
				left = hole.left + hole.width / 2 - cw / 2;
			} else if (placement === "left") {
				top = hole.top + hole.height / 2 - ch / 2;
				left = hole.left - cw - CARD_GAP;
			} else {
				top = hole.top + hole.height / 2 - ch / 2;
				left = hole.left + hole.width + CARD_GAP;
			}
		}
		top = clamp(top, EDGE, Math.max(EDGE, vh - ch - EDGE));
		left = clamp(left, EDGE, Math.max(EDGE, vw - cw - EDGE));
		setCardPos((prev) =>
			prev && near(prev.top, top) && near(prev.left, left)
				? prev
				: { top, left },
		);
	}, [hole, step.placement, index]);

	const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
	const next = useCallback(() => {
		if (last) onFinish();
		else setIndex((i) => i + 1);
	}, [last, onFinish]);

	useEffect(() => {
		nextRef.current?.focus();
	}, []);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				e.preventDefault();
				onSkip();
			} else if (e.key === "ArrowRight") {
				next();
			} else if (e.key === "ArrowLeft") {
				back();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [next, back, onSkip]);

	const body =
		typeof step.body === "string"
			? step.body
			: coarse
				? step.body.touch
				: step.body.mouse;
	// The ink scrim is painted by the cut-out's box-shadow; a thin marker ring
	// traces the hole itself (dropped when there's no target to trace).
	const scrim = "0 0 0 9999px color-mix(in oklab, var(--ink) 55%, transparent)";
	const ring =
		"0 0 0 2px color-mix(in oklab, var(--marker-blue) 70%, transparent)";

	return (
		<div
			className="fixed inset-0 z-[60] overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Quick tour"
		>
			<div
				aria-hidden
				className="absolute rounded-2xl transition-all duration-300 ease-out"
				style={
					hole
						? { ...hole, boxShadow: `${ring}, ${scrim}` }
						: { top: "50%", left: "50%", width: 0, height: 0, boxShadow: scrim }
				}
			/>

			<div
				ref={cardRef}
				className="paper-card absolute w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-4 transition-[top,left] duration-300 ease-out"
				style={cardPos ?? { top: 0, left: 0, visibility: "hidden" }}
			>
				<p className="kicker">
					{index + 1} of {steps.length}
				</p>
				<h2 className="font-display mt-1 text-lg font-extrabold text-ink">
					{step.title}
				</h2>
				<p className="mt-1.5 text-sm text-ink-soft">{body}</p>
				<div className="mt-4 flex items-center justify-between gap-2">
					<Button
						variant="ghost"
						size="sm"
						className="text-ink-faint hover:text-ink"
						onClick={onSkip}
					>
						Skip
					</Button>
					<div className="flex gap-2">
						{index > 0 && (
							<Button
								variant="outline"
								size="sm"
								className="rounded-full"
								onClick={back}
							>
								Back
							</Button>
						)}
						<Button
							ref={nextRef}
							size="sm"
							className="rounded-full px-4"
							onClick={next}
						>
							{last ? "Done" : "Next"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
