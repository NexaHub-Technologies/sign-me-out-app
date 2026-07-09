import { useEffect, useState } from "react";

import {
	getSupabaseBrowserClient,
	isSupabaseConfigured,
} from "#/lib/supabase.ts";

export type ReactionState = {
	/** markId → number of ❤️ */
	counts: Map<string, number>;
	/** markIds the current viewer has reacted to */
	mine: Set<string>;
};

/**
 * Live ❤️ counts for a space, mirroring use-realtime-marks: subscribe to
 * `mark_reactions` filtered by space, and fold INSERT/DELETE into a counts map
 * plus the viewer's own set. Postgres broadcasts the viewer's own writes back
 * too, so we treat the stream as the single source of truth (no optimistic
 * update to reconcile). DELETE payloads carry the full row (REPLICA IDENTITY
 * FULL) so we know which mark to decrement.
 */
export function useRealtimeReactions(
	spaceId: string,
	initialCounts: { markId: string; count: number }[],
	initialMine: string[],
	viewerId: string | null,
): ReactionState {
	const [state, setState] = useState<ReactionState>(() => ({
		counts: new Map(initialCounts.map((r) => [r.markId, r.count])),
		mine: new Set(initialMine),
	}));

	useEffect(() => {
		if (!isSupabaseConfigured()) return;
		const supabase = getSupabaseBrowserClient();
		const channel = supabase
			.channel(`reactions:${spaceId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "mark_reactions",
					filter: `space_id=eq.${spaceId}`,
				},
				(payload) => {
					const row = (
						payload.eventType === "DELETE" ? payload.old : payload.new
					) as { mark_id?: string; user_id?: string };
					const markId = row.mark_id;
					if (!markId) return;
					const delta = payload.eventType === "DELETE" ? -1 : 1;

					setState((prev) => {
						const counts = new Map(prev.counts);
						const next = Math.max(0, (counts.get(markId) ?? 0) + delta);
						if (next === 0) counts.delete(markId);
						else counts.set(markId, next);

						const mine = new Set(prev.mine);
						if (viewerId && row.user_id === viewerId) {
							if (delta === 1) mine.add(markId);
							else mine.delete(markId);
						}
						return { counts, mine };
					});
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [spaceId, viewerId]);

	return state;
}
