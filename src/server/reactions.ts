import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { markReactions, marks } from "#/db/schema.ts";
import { getSessionUser } from "#/server/auth.ts";

/**
 * Client-importable server fn (like marks.ts): `db` is only touched inside the
 * handler, so the compiler strips it from the browser bundle. One ❤️ per user
 * per mark for now — the emoji is fixed server-side.
 */

const EMOJI = "❤️";

/**
 * Toggle the current user's reaction on a mark: remove it if present, otherwise
 * add it. `spaceId` is taken from the mark (never the client) so a reaction is
 * always attributed to the right space. Idempotent via the unique index.
 */
export const toggleReaction = createServerFn({ method: "POST" })
	.validator((input: { markId: string }) => {
		const markId = input.markId?.trim();
		if (!markId) throw new Error("Missing mark");
		return { markId };
	})
	.handler(async ({ data }) => {
		const user = await getSessionUser();
		if (!user) throw new Error("Sign in to react");

		const [mark] = await db
			.select({ spaceId: marks.spaceId })
			.from(marks)
			.where(eq(marks.id, data.markId))
			.limit(1);
		if (!mark) throw new Error("Mark not found");

		const [existing] = await db
			.select({ id: markReactions.id })
			.from(markReactions)
			.where(
				and(
					eq(markReactions.markId, data.markId),
					eq(markReactions.userId, user.id),
					eq(markReactions.emoji, EMOJI),
				),
			)
			.limit(1);

		if (existing) {
			await db.delete(markReactions).where(eq(markReactions.id, existing.id));
			return { reacted: false };
		}

		await db
			.insert(markReactions)
			.values({
				markId: data.markId,
				spaceId: mark.spaceId,
				userId: user.id,
				emoji: EMOJI,
			})
			.onConflictDoNothing();
		return { reacted: true };
	});
