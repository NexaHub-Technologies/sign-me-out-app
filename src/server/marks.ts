import { createServerFn } from "@tanstack/react-start";
import { and, count, eq } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { marks, signSpaces } from "#/db/schema.ts";
import { assertMarkAllowed } from "#/lib/plan.ts";
import { getSessionUser, isSpaceHost } from "#/server/auth.ts";
import { signVoiceUrl } from "#/server/storage.ts";

export type StrokePoint = { x: number; y: number; pressure: number };

export type AddMarkInput = {
	id: string;
	spaceId: string;
	kind: "stroke" | "text" | "photo" | "voice";
	x: number;
	y: number;
	rotation?: number;
	scale?: number;
	z?: number;
	color?: string | null;
	points?: StrokePoint[] | null;
	size?: number | null;
	text?: string | null;
	fontSize?: number | null;
	width?: number | null;
	height?: number | null;
	mediaUrl?: string | null;
	caption?: string | null;
	durationMs?: number | null;
};

const KINDS = new Set(["stroke", "text", "photo", "voice"]);

export const addMark = createServerFn({ method: "POST" })
	.inputValidator((input: AddMarkInput) => {
		if (!input.id || !input.spaceId) throw new Error("Missing mark id/space");
		if (!KINDS.has(input.kind)) throw new Error(`Bad mark kind: ${input.kind}`);
		if (typeof input.x !== "number" || typeof input.y !== "number") {
			throw new Error("Mark needs x/y coordinates");
		}
		return input;
	})
	.handler(async ({ data }) => {
		const user = await getSessionUser();
		if (!user) throw new Error("Sign in to leave a mark");

		const [space] = await db
			.select({
				id: signSpaces.id,
				status: signSpaces.status,
				isPremium: signSpaces.isPremium,
			})
			.from(signSpaces)
			.where(eq(signSpaces.id, data.spaceId))
			.limit(1);
		if (!space) throw new Error("Space not found");
		if (space.status !== "open") throw new Error("This space is locked");

		// Free-tier boards: no voice notes, and at most FREE_MARK_LIMIT visible
		// marks. Check-then-insert is racy under a simultaneous burst of signers
		// (a couple of extras can slip in) — acceptable for a soft cap.
		if (!space.isPremium) {
			const [{ visible }] = await db
				.select({ visible: count() })
				.from(marks)
				.where(and(eq(marks.spaceId, space.id), eq(marks.status, "visible")));
			assertMarkAllowed(data.kind, space.isPremium, visible);
		}

		const [mark] = await db
			.insert(marks)
			.values({
				id: data.id,
				spaceId: data.spaceId,
				authorId: user.id,
				authorName: user.name,
				kind: data.kind,
				x: data.x,
				y: data.y,
				rotation: data.rotation ?? 0,
				scale: data.scale ?? 1,
				z: data.z ?? 0,
				color: data.color ?? null,
				points: data.points ?? null,
				size: data.size ?? null,
				text: data.text ?? null,
				fontSize: data.fontSize ?? null,
				width: data.width ?? null,
				height: data.height ?? null,
				mediaUrl: data.mediaUrl ?? null,
				caption: data.caption ?? null,
				durationMs: data.durationMs ?? null,
			})
			.returning();
		return mark;
	});

/** Author or host may move/transform a mark. */
export const updateMark = createServerFn({ method: "POST" })
	.inputValidator(
		(input: {
			id: string;
			x: number;
			y: number;
			rotation: number;
			scale: number;
		}) => input,
	)
	.handler(async ({ data }) => {
		await assertCanEdit(data.id);
		await db
			.update(marks)
			.set({ x: data.x, y: data.y, rotation: data.rotation, scale: data.scale })
			.where(eq(marks.id, data.id));
		return { ok: true };
	});

/** Author or host may remove a mark (soft delete). */
export const removeMark = createServerFn({ method: "POST" })
	.inputValidator((input: { id: string }) => input)
	.handler(async ({ data }) => {
		await assertCanEdit(data.id);
		await db
			.update(marks)
			.set({ status: "hidden" })
			.where(eq(marks.id, data.id));
		return { ok: true };
	});

/** Author or host may bring back a soft-deleted mark (undo of a removal). */
export const restoreMark = createServerFn({ method: "POST" })
	.inputValidator((input: { id: string }) => input)
	.handler(async ({ data }) => {
		await assertCanEdit(data.id);
		await db
			.update(marks)
			.set({ status: "visible" })
			.where(eq(marks.id, data.id));
		return { ok: true };
	});

/**
 * Resolve a playable URL for a voice note — only for the host (cookie token or
 * account owner) or the recording's author. Voice files live in a private
 * bucket, so this mints a short-lived signed URL; legacy notes stored as an
 * absolute (public) URL are returned as-is.
 */
export const getVoiceUrl = createServerFn({ method: "POST" })
	.inputValidator((input: { markId: string }) => {
		if (!input.markId) throw new Error("Missing recording id");
		return input;
	})
	.handler(async ({ data }) => {
		const [mark] = await db
			.select({
				kind: marks.kind,
				mediaUrl: marks.mediaUrl,
				authorId: marks.authorId,
				spaceId: marks.spaceId,
			})
			.from(marks)
			.where(eq(marks.id, data.markId))
			.limit(1);
		if (!mark || mark.kind !== "voice" || !mark.mediaUrl) {
			throw new Error("Recording not found");
		}

		const user = await getSessionUser();
		let allowed = !!user && mark.authorId === user.id;
		if (!allowed) {
			const [space] = await db
				.select({
					hostToken: signSpaces.hostToken,
					ownerId: signSpaces.ownerId,
				})
				.from(signSpaces)
				.where(eq(signSpaces.id, mark.spaceId))
				.limit(1);
			allowed = !!space && isSpaceHost(space, user);
		}
		if (!allowed) {
			throw new Error(
				"Only the host or the author can listen to this recording",
			);
		}

		// Legacy public uploads are already absolute URLs; private notes are paths.
		if (/^https?:\/\//.test(mark.mediaUrl)) return { url: mark.mediaUrl };
		return { url: await signVoiceUrl(mark.mediaUrl) };
	});

/**
 * Gate edits/moves/deletes: only the mark's author or the space host (cookie
 * host or account owner) may proceed. This is the sole server-side enforcement
 * point for mutating an existing mark, so UI gating need not be trusted.
 */
async function assertCanEdit(markId: string) {
	const [mark] = await db
		.select({ authorId: marks.authorId, spaceId: marks.spaceId })
		.from(marks)
		.where(eq(marks.id, markId))
		.limit(1);
	if (!mark) throw new Error("Mark not found");

	const user = await getSessionUser();
	if (user && mark.authorId === user.id) return; // the object's creator

	const [space] = await db
		.select({ hostToken: signSpaces.hostToken, ownerId: signSpaces.ownerId })
		.from(signSpaces)
		.where(eq(signSpaces.id, mark.spaceId))
		.limit(1);
	if (space && isSpaceHost(space, user)) return; // the space host

	throw new Error("Only the space host or the object's creator can do that");
}
