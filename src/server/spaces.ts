import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, countDistinct, desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "#/db/index.ts";
import { marks, payments, signSpaces } from "#/db/schema.ts";
import { BOARD_COLOR_IDS } from "#/lib/board-colors.ts";
import { type GiftInput, normalizeGift } from "#/lib/gift.ts";
import {
	ensureHostToken,
	getHostToken,
	getSessionUser,
	isSpaceHost,
} from "#/server/auth.ts";
import {
	assertSpacePaymentPaid,
	consumeSpacePayment,
} from "#/server/payments-core.ts";
import { deleteSpaceMedia } from "#/server/storage.ts";

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
		(input: {
			title: string;
			note?: string;
			boardColor?: string;
			gift?: GiftInput;
			paymentReference: string;
		}) => {
			const title = input.title?.trim();
			if (!title) throw new Error("A space name is required");
			const paymentReference = input.paymentReference?.trim();
			if (!paymentReference) throw new Error("Payment is required");
			const boardColor = BOARD_COLOR_IDS.includes(input.boardColor ?? "")
				? (input.boardColor as string)
				: "paper";
			return {
				title,
				note: input.note?.trim() || null,
				boardColor,
				gift: normalizeGift(input.gift ?? {}),
				paymentReference,
			};
		},
	)
	.handler(async ({ data }) => {
		// Opening a space is gated on a paid Paystack transaction. The user must be
		// signed in (we charge their account), and the reference must verify as a
		// completed ₦1,000 payment that hasn't already been used for a space.
		const user = await getSessionUser();
		if (!user) throw new Error("Sign in to open a space");
		await assertSpacePaymentPaid(data.paymentReference, user.id);

		const hostToken = ensureHostToken();
		const [space] = await db
			.insert(signSpaces)
			.values({
				slug: slugify(data.title),
				title: data.title,
				note: data.note,
				boardColor: data.boardColor,
				giftBankName: data.gift?.bankName ?? null,
				giftAccountNumber: data.gift?.accountNumber ?? null,
				giftAccountName: data.gift?.accountName ?? null,
				hostToken,
				ownerId: user.id,
			})
			.returning({ id: signSpaces.id, slug: signSpaces.slug });

		await consumeSpacePayment(data.paymentReference, space.id);
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
		const isHost = isSpaceHost(space, user);
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
		if (!isSpaceHost(space, user)) {
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

/**
 * Host-only: permanently delete a space and everything on it. Marks cascade at
 * the DB level (marks.space_id ON DELETE CASCADE); we also drop the space's
 * payment rows first (in the same transaction) so the single-use payment
 * reference can't be recycled into a free space once its FK is nulled, and
 * best-effort purge the private voice/photo files. Irreversible.
 */
export const deleteSpace = createServerFn({ method: "POST" })
	.inputValidator((input: { slug: string }) => {
		const slug = input.slug?.trim();
		if (!slug) throw new Error("Missing space");
		return { slug };
	})
	.handler(async ({ data }) => {
		const [space] = await db
			.select()
			.from(signSpaces)
			.where(eq(signSpaces.slug, data.slug))
			.limit(1);
		if (!space) throw new Error("Space not found");
		const user = await getSessionUser();
		if (!isSpaceHost(space, user)) {
			throw new Error("Only the host can delete this space");
		}

		// Purge private media before the row is gone (uses the stored space id).
		// Never blocks the delete — deleteSpaceMedia swallows its own errors, but
		// guard here too in case the bucket/service is unreachable.
		await deleteSpaceMedia(space.id).catch(() => {});

		await db.transaction(async (tx) => {
			// Drop the payment(s) tied to this space first. If we let the space
			// delete null their space_id (ON DELETE SET NULL), the reference would
			// look unused again and could open another space for free.
			await tx.delete(payments).where(eq(payments.spaceId, space.id));
			await tx.delete(signSpaces).where(eq(signSpaces.id, space.id));
		});

		return { ok: true as const };
	});

export const setBoardColor = createServerFn({ method: "POST" })
	.inputValidator((input: { slug: string; boardColor: string }) => {
		if (!BOARD_COLOR_IDS.includes(input.boardColor)) {
			throw new Error("Unknown board colour");
		}
		return input;
	})
	.handler(async ({ data }) => {
		const [space] = await db
			.select()
			.from(signSpaces)
			.where(eq(signSpaces.slug, data.slug))
			.limit(1);
		if (!space) throw new Error("Space not found");
		const user = await getSessionUser();
		if (!isSpaceHost(space, user)) {
			throw new Error("Only the host can change the board colour");
		}
		await db
			.update(signSpaces)
			.set({ boardColor: data.boardColor, updatedAt: new Date().toISOString() })
			.where(eq(signSpaces.id, space.id));
		return { boardColor: data.boardColor };
	});

/**
 * Host-only: attach, change, or remove the cash-gift account shown on the
 * canvas. An empty/partial gift clears it (see normalizeGift). Returns the
 * stored gift (or nulls) so the client can update in place.
 */
export const setSpaceGift = createServerFn({ method: "POST" })
	.inputValidator((input: { slug: string; gift: GiftInput }) => ({
		slug: input.slug,
		gift: normalizeGift(input.gift ?? {}),
	}))
	.handler(async ({ data }) => {
		const [space] = await db
			.select()
			.from(signSpaces)
			.where(eq(signSpaces.slug, data.slug))
			.limit(1);
		if (!space) throw new Error("Space not found");
		const user = await getSessionUser();
		if (!isSpaceHost(space, user)) {
			throw new Error("Only the host can change the gift");
		}
		await db
			.update(signSpaces)
			.set({
				giftBankName: data.gift?.bankName ?? null,
				giftAccountNumber: data.gift?.accountNumber ?? null,
				giftAccountName: data.gift?.accountName ?? null,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(signSpaces.id, space.id));
		return {
			giftBankName: data.gift?.bankName ?? null,
			giftAccountNumber: data.gift?.accountNumber ?? null,
			giftAccountName: data.gift?.accountName ?? null,
		};
	});
