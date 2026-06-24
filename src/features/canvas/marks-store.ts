import { useCallback, useMemo, useState } from "react";

import type { Mark } from "#/features/canvas/types.ts";

/**
 * Local canvas state: a Map keyed by mark id. Optimistic local inserts and
 * Realtime echoes both call `upsert`, so duplicates collapse by id automatically.
 */
export function useMarksStore(initial: Mark[]) {
	const [map, setMap] = useState<Map<string, Mark>>(
		() => new Map(initial.map((m) => [m.id, m])),
	);

	const upsert = useCallback((mark: Mark) => {
		setMap((prev) => {
			const next = new Map(prev);
			next.set(mark.id, mark);
			return next;
		});
	}, []);

	const remove = useCallback((id: string) => {
		setMap((prev) => {
			if (!prev.has(id)) return prev;
			const next = new Map(prev);
			next.delete(id);
			return next;
		});
	}, []);

	const marks = useMemo(
		() =>
			[...map.values()].sort(
				(a, b) =>
					(a.z ?? 0) - (b.z ?? 0) || a.createdAt.localeCompare(b.createdAt),
			),
		[map],
	);

	return { marks, count: map.size, upsert, remove };
}
