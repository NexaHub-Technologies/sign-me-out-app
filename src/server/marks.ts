import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "#/db/index.ts";
import { marks, signSpaces } from "#/db/schema.ts";
import { getHostToken, getSessionUser } from "#/server/auth.ts";

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
			.select({ id: signSpaces.id, status: signSpaces.status })
			.from(signSpaces)
			.where(eq(signSpaces.id, data.spaceId))
			.limit(1);
		if (!space) throw new Error("Space not found");
		if (space.status !== "open") throw new Error("This space is locked");

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

async function assertCanEdit(markId: string) {
	const [mark] = await db
		.select({ authorId: marks.authorId, spaceId: marks.spaceId })
		.from(marks)
		.where(eq(marks.id, markId))
		.limit(1);
	if (!mark) throw new Error("Mark not found");

	const user = await getSessionUser();
	if (user && mark.authorId === user.id) return;

	const [space] = await db
		.select({ hostToken: signSpaces.hostToken })
		.from(signSpaces)
		.where(eq(signSpaces.id, mark.spaceId))
		.limit(1);
	if (space && getHostToken() === space.hostToken) return;

	throw new Error("You can only edit your own marks");
}
