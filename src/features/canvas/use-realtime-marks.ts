import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect } from "react";
import type { Mark } from "#/features/canvas/types.ts";
import {
	getSupabaseBrowserClient,
	isSupabaseConfigured,
} from "#/lib/supabase.ts";

/** Realtime payloads use raw DB (snake_case) column names — map to our Mark. */
// biome-ignore lint/suspicious/noExplicitAny: realtime row is loosely typed
function rowToMark(r: any): Mark {
	return {
		id: r.id,
		spaceId: r.space_id,
		authorId: r.author_id ?? null,
		authorName: r.author_name,
		kind: r.kind,
		x: r.x,
		y: r.y,
		rotation: r.rotation,
		scale: r.scale,
		z: r.z,
		color: r.color ?? null,
		points: r.points ?? null,
		size: r.size ?? null,
		text: r.text ?? null,
		fontSize: r.font_size ?? null,
		width: r.width ?? null,
		height: r.height ?? null,
		mediaUrl: r.media_url ?? null,
		caption: r.caption ?? null,
		durationMs: r.duration_ms ?? null,
		status: r.status,
		createdAt: r.created_at,
	};
}

/**
 * Subscribe to live changes for one space's marks. INSERT/UPDATE upsert (unless
 * hidden), DELETE/hidden remove. Own optimistic inserts dedupe by id in the store.
 */
export function useRealtimeMarks(
	spaceId: string,
	upsert: (m: Mark) => void,
	remove: (id: string) => void,
) {
	useEffect(() => {
		if (!isSupabaseConfigured()) return;
		const supabase = getSupabaseBrowserClient();
		const channel = supabase
			.channel(`marks:${spaceId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "marks",
					filter: `space_id=eq.${spaceId}`,
				},
				(payload: RealtimePostgresChangesPayload<{ [k: string]: unknown }>) => {
					if (payload.eventType === "DELETE") {
						const old = payload.old as { id?: string };
						if (old.id) remove(old.id);
						return;
					}
					const mark = rowToMark(payload.new);
					if (mark.status === "visible") upsert(mark);
					else remove(mark.id);
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [spaceId, upsert, remove]);
}
