import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "#/db/index.ts";
import { marks, signSpaces } from "#/db/schema.ts";
import { ensureHostToken, getHostToken } from "#/server/auth.ts";

function slugify(title: string) {
	const base = title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return `${base || "space"}-${nanoid(6)}`;
}

export const createSpace = createServerFn({ method: "POST" })
	.inputValidator(
		(input: { title: string; note?: string; boardColor?: string }) => {
			const title = input.title?.trim();
			if (!title) throw new Error("A space name is required");
			return {
				title,
				note: input.note?.trim() || null,
				boardColor: input.boardColor || "paper",
			};
		},
	)
	.handler(async ({ data }) => {
		const hostToken = ensureHostToken();
		const [space] = await db
			.insert(signSpaces)
			.values({
				slug: slugify(data.title),
				title: data.title,
				note: data.note,
				boardColor: data.boardColor,
				hostToken,
			})
			.returning({ slug: signSpaces.slug });
		return { slug: space.slug };
	});

export const getSpaceBySlug = createServerFn({ method: "GET" })
	.inputValidator((slug: string) => slug)
	.handler(async ({ data: slug }) => {
		const [space] = await db
			.select()
			.from(signSpaces)
			.where(eq(signSpaces.slug, slug))
			.limit(1);
		if (!space) return null;

		const items = await db
			.select()
			.from(marks)
			.where(and(eq(marks.spaceId, space.id), eq(marks.status, "visible")))
			.orderBy(asc(marks.z), asc(marks.createdAt));

		const isHost = getHostToken() === space.hostToken;
		// host_token is a secret — never ship it to the client.
		const { hostToken: _omit, ...publicSpace } = space;
		return { space: publicSpace, marks: items, isHost };
	});

export const lockSpace = createServerFn({ method: "POST" })
	.inputValidator((input: { slug: string; locked: boolean }) => input)
	.handler(async ({ data }) => {
		const [space] = await db
			.select()
			.from(signSpaces)
			.where(eq(signSpaces.slug, data.slug))
			.limit(1);
		if (!space) throw new Error("Space not found");
		if (getHostToken() !== space.hostToken) {
			throw new Error("Only the host can lock this space");
		}
		await db
			.update(signSpaces)
			.set({
				status: data.locked ? "locked" : "open",
				updatedAt: new Date().toISOString(),
			})
			.where(eq(signSpaces.id, space.id));
		return { status: data.locked ? "locked" : "open" };
	});
