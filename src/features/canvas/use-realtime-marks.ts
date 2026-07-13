import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect } from "react";
import type { Mark } from "#/features/canvas/types.ts";
import {
	getSupabaseBrowserClient,
	isSupabaseConfigured,
} from "#/lib/supabase.ts";

/** Raw DB (snake_case) column → Mark field. */
const COLUMNS: Record<string, keyof Mark> = {
	id: "id",
	space_id: "spaceId",
	author_id: "authorId",
	author_name: "authorName",
	kind: "kind",
	x: "x",
	y: "y",
	rotation: "rotation",
	scale: "scale",
	z: "z",
	color: "color",
	points: "points",
	size: "size",
	text: "text",
	font_size: "fontSize",
	width: "width",
	height: "height",
	media_url: "mediaUrl",
	caption: "caption",
	duration_ms: "durationMs",
	status: "status",
	created_at: "createdAt",
};

/**
 * Map only the columns actually present in a realtime payload. UPDATE events
 * omit unchanged TOASTed columns (e.g. a long stroke's `points` jsonb), so an
 * absent column means "unchanged", not null — it must not be defaulted.
 */
function rowToPartial(
	r: Record<string, unknown>,
): Partial<Mark> & { id: string } {
	const out: Record<string, unknown> = {};
	for (const [col, field] of Object.entries(COLUMNS)) {
		if (col in r) out[field] = r[col];
	}
	return out as Partial<Mark> & { id: string };
}

/**
 * Subscribe to live changes for one space's marks. INSERT payloads carry the
 * full row and upsert; UPDATE payloads can be partial and are merged onto the
 * cached mark (the store filters hidden marks out of the render list); DELETE
 * removes.
 */
export function useRealtimeMarks(
	spaceId: string,
	upsert: (m: Mark) => void,
	patch: (id: string, p: Partial<Mark>) => void,
	remove: (id: string) => void,
	enabled = true,
) {
	useEffect(() => {
		if (!enabled || !isSupabaseConfigured()) return;
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
					const row = rowToPartial(payload.new as Record<string, unknown>);
					if (payload.eventType === "INSERT") upsert(row as Mark);
					else patch(row.id, row);
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [spaceId, upsert, patch, remove, enabled]);
}
