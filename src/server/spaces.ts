import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, countDistinct, desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "#/db/index.ts";
import { marks, signSpaces } from "#/db/schema.ts";
import {
	ensureHostToken,
	getHostToken,
	getSessionUser,
} from "#/server/auth.ts";

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
		const user = await getSessionUser();
		const [space] = await db
			.insert(signSpaces)
			.values({
				slug: slugify(data.title),
				title: data.title,
				note: data.note,
				boardColor: data.boardColor,
				hostToken,
				ownerId: user?.id ?? null,
			})
			.returning({ slug: signSpaces.slug });
		return { slug: space.slug };
	});

/**
 * Spaces created by the current host (identified by the signed host_token
 * cookie), newest first, each with visible-mark and distinct-contributor counts
 * for the dashboard cards.
 */
export const listMySpaces = createServerFn({ method: "GET" }).handler(
	async () => {
		const hostToken = getHostToken();
		const user = await getSessionUser();
		// Match spaces owned by the signed-in user (across devices) or created
		// under this browser's host cookie (covers anonymous / pre-login hosts).
		const owners = [
			user ? eq(signSpaces.ownerId, user.id) : undefined,
			hostToken ? eq(signSpaces.hostToken, hostToken) : undefined,
		].filter((c) => c !== undefined);
		if (owners.length === 0) return [];
		return db
			.select({
				id: signSpaces.id,
				slug: signSpaces.slug,
				title: signSpaces.title,
				boardColor: signSpaces.boardColor,
				status: signSpaces.status,
				updatedAt: signSpaces.updatedAt,
				marks: count(marks.id),
				contributors: countDistinct(marks.authorId),
			})
			.from(signSpaces)
			.leftJoin(
				marks,
				and(eq(marks.spaceId, signSpaces.id), eq(marks.status, "visible")),
			)
			.where(or(...owners))
			.groupBy(signSpaces.id)
			.orderBy(desc(signSpaces.updatedAt));
	},
);

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

		const user = await getSessionUser();
		const isHost =
			getHostToken() === space.hostToken ||
			(!!space.ownerId && user?.id === space.ownerId);
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
		const user = await getSessionUser();
		const isHost =
			getHostToken() === space.hostToken ||
			(!!space.ownerId && user?.id === space.ownerId);
		if (!isHost) {
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
