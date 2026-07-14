import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import type { TourStep } from "./spotlight-tour.tsx";

/**
 * Global (not per-space): seeing the tour once is enough, whichever board it
 * was on. The version suffix lets us re-show it after a major UI change.
 */
export const TOUR_SEEN_KEY = "smo_tour_seen_v1";

// localStorage can throw (private-mode Safari) — the tour just won't persist.
function hasSeenTour(): boolean {
	try {
		return localStorage.getItem(TOUR_SEEN_KEY) === "1";
	} catch {
		return false;
	}
}

function markTourSeen() {
	try {
		localStorage.setItem(TOUR_SEEN_KEY, "1");
	} catch {
		/* fine — worst case the tour offers itself again next visit */
	}
}

/**
 * The walkthrough for a sign space. Hosts and invited guests both get it, but
 * the steps differ: host-only controls (board colour, lock) are skipped for
 * guests, the copy shifts from "your board" to "this board", and the gift step
 * only shows guests a card that actually exists.
 */
export function buildSpaceTourSteps({
	isHost,
	hasGift,
}: {
	isHost: boolean;
	hasGift: boolean;
}): TourStep[] {
	const steps: (TourStep | false)[] = [
		{
			id: "welcome",
			target: null,
			title: isHost ? "Your space is live!" : "You've been invited to sign",
			body: isHost
				? "Friends can now sign your board with doodles, notes and voice messages. Here's a quick tour of your host tools."
				: "Leave a doodle, a note or a voice message on this board. Here's a quick tour of the tools.",
		},
		{
			id: "dock",
			target: '[data-tour="dock"]',
			placement: "top",
			title: "The pen tray",
			body: "Everything for making marks lives down here — plus undo and redo on the left if anything goes wrong.",
		},
		{
			id: "pen",
			target: '[data-tour="tool-pen"]',
			placement: "top",
			title: "Pen",
			body: "Draw or sign freehand, anywhere on the board.",
		},
		{
			id: "text",
			target: '[data-tour="tool-text"]',
			placement: "top",
			title: "Text",
			body: "Tap anywhere to type a note. A size stepper appears above the tray while it's active.",
		},
		{
			id: "voice",
			target: '[data-tour="tool-voice"]',
			placement: "top",
			title: "Voice notes",
			body: "Record a short message that lives on the board as a playable clip.",
		},
		{
			id: "marker",
			target: '[data-tour="marker-color"]',
			placement: "top",
			title: "Ink colour",
			body: "Tap the swatch to switch marker colours for pen and text.",
		},
		{
			id: "move",
			target: '[data-tour="tool-move"]',
			placement: "top",
			title: "Move & zoom",
			body: {
				touch:
					"With the hand tool, drag with one finger to pan and pinch to zoom — the board is bigger than your screen.",
				mouse:
					"With the hand tool, drag to pan and scroll to zoom — or use the % stepper above the tray.",
			},
		},
		isHost && {
			id: "board-color",
			target: '[data-tour="board-color"]',
			placement: "bottom",
			title: "Board colour",
			body: "Only you can recolour the board. Pick a paper that fits the occasion.",
		},
		{
			id: "share",
			target: '[data-tour="share"]',
			placement: "bottom",
			title: "Share the link",
			body: isHost
				? "This is how people get in. Anyone with the link can sign — they never pay."
				: "Know someone else who should sign? Anyone with the link can add their mark.",
		},
		isHost && {
			id: "lock",
			target: '[data-tour="lock"]',
			placement: "bottom",
			title: "Lock it when it's done",
			body: "Locking freezes the board — no new marks, edits or deletions. You can unlock any time.",
		},
		// Guests only get this step when there's actually a gift card on screen.
		(isHost || hasGift) && {
			id: "gift",
			target: '[data-tour="gift"]',
			placement: "bottom",
			title: isHost ? "Cash gifts" : "Send a gift",
			body: isHost
				? "Add a bank account here and friends can copy it to send you a send-off gift."
				: "The host is collecting send-off gifts — open this card to copy their account details.",
		},
	];
	return steps.filter((s): s is TourStep => Boolean(s));
}

/**
 * Decides when the tour shows: on a visitor's first ever board (host or
 * guest), or always when arriving fresh from the create flow (`?welcome=1`).
 * The welcome param is consumed and stripped so copied URLs stay clean.
 */
export function useSpaceTour({ welcome }: { welcome: boolean }) {
	const navigate = useNavigate();
	const [active, setActive] = useState(false);

	useEffect(() => {
		const shouldShow = welcome || !hasSeenTour();
		if (welcome) {
			navigate({ to: ".", search: {}, replace: true });
		}
		if (!shouldShow) return;
		// The dock lives inside the lazily-loaded canvas — wait for it to mount
		// so the first spotlight has something to land on.
		let tries = 0;
		const id = setInterval(() => {
			if (document.querySelector('[data-tour="dock"]')) {
				clearInterval(id);
				setActive(true);
			} else if (++tries > 66) {
				clearInterval(id); // canvas never mounted (~10s) — don't tour a broken page
			}
		}, 150);
		return () => clearInterval(id);
	}, [welcome, navigate]);

	const dismiss = useCallback(() => {
		markTourSeen();
		setActive(false);
	}, []);

	const start = useCallback(() => setActive(true), []);

	return { active, start, dismiss };
}
