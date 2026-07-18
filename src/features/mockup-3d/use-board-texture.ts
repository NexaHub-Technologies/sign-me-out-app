import { useCallback, useEffect, useState } from "react";
import type { Mark } from "#/features/canvas/types.ts";
import { boardColorById } from "#/lib/board-colors.ts";
import { getSpaceBySlug } from "#/server/spaces.ts";

type BoardTextureState = {
	/** The rasterized board PNG, once captured. Null before/if unavailable. */
	dataUrl: string | null;
	/** Real marks fetched for the board — handed to BoardTextureCapture to render. */
	marks: Mark[] | null;
	backgroundColor: string;
	loading: boolean;
	error: string | null;
};

const IDLE: BoardTextureState = {
	dataUrl: null,
	marks: null,
	backgroundColor: "#f6f2ea",
	loading: false,
	error: null,
};

/**
 * Fetches a board's real marks (reusing the same `getSpaceBySlug` server fn
 * the live canvas uses) and exposes them for `BoardTextureCapture` to
 * rasterize. Not gated by `isPremium` — this only ever produces an in-memory
 * texture, nothing downloadable, so free boards get a 3D preview too.
 */
export function useBoardTexture(slug: string | null) {
	const [state, setState] = useState<BoardTextureState>(IDLE);

	useEffect(() => {
		if (!slug) {
			setState(IDLE);
			return;
		}
		let cancelled = false;
		setState({ ...IDLE, loading: true });

		getSpaceBySlug({ data: slug })
			.then((res) => {
				if (cancelled) return;
				if (!res) {
					setState({ ...IDLE, error: "Board not found" });
					return;
				}
				setState({
					dataUrl: null,
					marks: res.marks,
					backgroundColor: boardColorById(res.space.boardColor).bg,
					loading: true, // still waiting on the rasterize step
					error: null,
				});
			})
			.catch((err) => {
				if (cancelled) return;
				setState({
					...IDLE,
					error: err instanceof Error ? err.message : "Could not load board",
				});
			});

		return () => {
			cancelled = true;
		};
	}, [slug]);

	// Stable across renders (functional setState updater only) — passed
	// straight to BoardTextureCapture's effect deps, see its own comment.
	const onCapture = useCallback((dataUrl: string | null) => {
		setState((prev) => ({ ...prev, dataUrl, loading: false }));
	}, []);

	return { ...state, onCapture };
}
