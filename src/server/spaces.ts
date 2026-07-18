import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, countDistinct, desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "#/db/index.ts";
import { marks, profiles, signSpaces } from "#/db/schema.ts";
import { BOARD_COLOR_IDS } from "#/lib/board-colors.ts";
import { type GiftInput, normalizeGift } from "#/lib/gift.ts";
import { UNLOCK_PRICE_KOBO } from "#/lib/plan.ts";
import {
	ensureHostToken,
	getHostToken,
	getSessionUser,
	isSpaceHost,
} from "#/server/auth.ts";
import { isSealed, maybeRevealSpace } from "#/server/reveal-core.ts";
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
			university: string;
			gift?: GiftInput;
			revealAt?: string;
		}) => {
			const title = input.title?.trim();
			if (!title) throw new Error("A space name is required");
			const university = input.university?.trim().slice(0, 120);
			if (!university) {
				throw new Error("Select the university you're signing out from");
			}
			const boardColor = BOARD_COLOR_IDS.includes(input.boardColor ?? "")
				? (input.boardColor as string)
				: "paper";
			// Optional time-capsule reveal: must parse and be in the future.
			let revealAt: string | null = null;
			if (input.revealAt) {
				const when = new Date(input.revealAt);
				if (Number.isNaN(when.getTime())) {
					throw new Error("Reveal date is invalid");
				}
				if (when.getTime() <= Date.now()) {
					throw new Error("Reveal date must be in the future");
				}
				revealAt = when.toISOString();
			}
			return {
				title,
				note: input.note?.trim() || null,
				boardColor,
				university,
				gift: normalizeGift(input.gift ?? {}),
				revealAt,
			};
		},
	)
	.handler(async ({ data }) => {
		// Every account gets one free (limited) board. Opening more takes an
		// unlock (₦1,000), which stamps profiles.spaces_unlocked_at.
		const user = await getSessionUser();
		if (!user) throw new Error("Sign in to open a space");
		const { canCreate } = await createEligibility(user.id);
		if (!canCreate) {
			throw new Error(
				"Unlock one of your boards (₦1,000) to open as many boards as you like",
			);
		}

		const hostToken = ensureHostToken();
		const [space] = await db
			.insert(signSpaces)
			.values({
				slug: slugify(data.title),
				title: data.title,
				note: data.note,
				boardColor: data.boardColor,
				university: data.university,
				giftBankName: data.gift?.bankName ?? null,
				giftAccountNumber: data.gift?.accountNumber ?? null,
				giftAccountName: data.gift?.accountName ?? null,
				revealAt: data.revealAt,
				hostToken,
				ownerId: user.id,
			})
			.returning({ id: signSpaces.id, slug: signSpaces.slug });

		return { slug: space.slug };
	});

/**
 * Whether this account may open another board: yes while it holds none, and
 * always once any unlock stamped the profile. When blocked, also pick the
 * newest still-locked board as the natural "unlock this one" target.
 */
async function createEligibility(userId: string): Promise<{
	canCreate: boolean;
	upgradeTarget: { slug: string; title: string } | null;
}> {
	const owned = await db
		.select({
			slug: signSpaces.slug,
			title: signSpaces.title,
			isPremium: signSpaces.isPremium,
		})
		.from(signSpaces)
		.where(eq(signSpaces.ownerId, userId))
		.orderBy(desc(signSpaces.updatedAt));
	if (owned.length === 0) return { canCreate: true, upgradeTarget: null };

	const [profile] = await db
		.select({ spacesUnlockedAt: profiles.spacesUnlockedAt })
		.from(profiles)
		.where(eq(profiles.id, userId))
		.limit(1);
	if (profile?.spacesUnlockedAt)
		return { canCreate: true, upgradeTarget: null };

	const target = owned.find((s) => !s.isPremium) ?? null;
	return {
		canCreate: false,
		upgradeTarget: target ? { slug: target.slug, title: target.title } : null,
	};
}

/** Create-page data: may this account open another board, and if not, which board to unlock. */
export const getCreateEligibility = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getSessionUser();
		if (!user) return { canCreate: false, upgradeTarget: null };
		return createEligibility(user.id);
	},
);

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
				isPremium: signSpaces.isPremium,
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

		const user = await getSessionUser();
		const isHost = isSpaceHost(space, user);

		// If this is a capsule whose time has come, open it + email signers once.
		await maybeRevealSpace(space);

		// host_token is a secret — never ship it to the client.
		const { hostToken: _omit, ...publicSpace } = space;

		// Quote the flat unlock price to the host of a still-locked board.
		// Null = no unlock to offer (signer view, or already premium).
		const unlockPriceKoboQuote =
			isHost && !space.isPremium ? UNLOCK_PRICE_KOBO : null;

		// Sealed capsule (non-host, reveal still in the future): withhold the
		// board. Signing still works — the client shows a countdown, not marks.
		if (!isHost && isSealed(space)) {
			return {
				space: publicSpace,
				marks: [],
				isHost,
				sealed: true as const,
				unlockPriceKobo: null,
			};
		}

		const items = await db
			.select()
			.from(marks)
			.where(and(eq(marks.spaceId, space.id), eq(marks.status, "visible")))
			.orderBy(asc(marks.z), asc(marks.createdAt));

		return {
			space: publicSpace,
			marks: items,
			isHost,
			sealed: false as const,
			unlockPriceKobo: unlockPriceKoboQuote,
		};
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
 * the DB level (marks.space_id ON DELETE CASCADE); private voice/photo files
 * are purged best-effort. Payment rows stay (space_id nulls out) — they're the
 * financial record, and a reference is spent by the row's existence, so a
 * nulled FK can't be replayed into another unlock. Irreversible.
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

		await db.delete(signSpaces).where(eq(signSpaces.id, space.id));

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
