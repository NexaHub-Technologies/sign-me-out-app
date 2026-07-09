import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * A sign-out space — the infinite canvas everyone signs. Hosts are cookie-only
 * (host_token matches a signed cookie); signers are Supabase-authenticated users.
 */
export const signSpaces = pgTable(
	"sign_spaces",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		slug: text().notNull(),
		title: text().notNull(),
		note: text(),
		boardColor: text("board_color").default("paper").notNull(),
		// Optional "sign with a gift" — a bank account signers can copy to send a
		// cash gift. All three are set together or all null (see lib/gift.ts).
		giftBankName: text("gift_bank_name"),
		giftAccountNumber: text("gift_account_number"),
		giftAccountName: text("gift_account_name"),
		hostToken: uuid("host_token").notNull(),
		// The authenticated creator, when signed in — lets a host see their spaces
		// across devices. Null for spaces created by a cookie-only (anonymous) host.
		ownerId: uuid("owner_id"),
		status: text().default("open").notNull(), // 'open' | 'locked'
		// Time-capsule: while reveal_at is in the future, non-hosts see a countdown
		// (they can still sign, but the board stays sealed). Null = not a capsule.
		// revealed_at is stamped once, the first time a read happens at/after
		// reveal_at, so the "it's open!" email blast fires exactly once.
		revealAt: timestamp("reveal_at", { withTimezone: true, mode: "string" }),
		revealedAt: timestamp("revealed_at", {
			withTimezone: true,
			mode: "string",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("sign_spaces_slug_idx").on(table.slug),
		index("sign_spaces_owner_idx").on(table.ownerId),
	],
).enableRLS();

/**
 * One row per element placed on a canvas. A single table covers every kind:
 *   - 'stroke'  signatures & doodles (perfect-freehand points + color + size)
 *   - 'text'    well-wishes (text + font_size + width)
 *   - 'photo'   images (media_url + width/height + caption)
 *   - 'voice'   audio recordings (media_url + duration_ms + caption)
 * Ids are generated client-side so the Realtime echo of our own insert dedupes.
 */
export const marks = pgTable(
	"marks",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		spaceId: uuid("space_id")
			.notNull()
			.references(() => signSpaces.id, { onDelete: "cascade" }),
		authorId: uuid("author_id"),
		authorName: text("author_name").notNull(),
		kind: text().notNull(), // 'stroke' | 'text' | 'photo' | 'voice'

		// world transform
		x: real().notNull(),
		y: real().notNull(),
		rotation: real().default(0).notNull(),
		scale: real().default(1).notNull(),
		z: integer().default(0).notNull(),

		color: text(),

		// stroke
		points: jsonb().$type<{ x: number; y: number; pressure: number }[]>(), // relative to (x, y)
		size: real(),

		// text
		text: text(),
		fontSize: real("font_size"),

		// media (photo / voice) + text box sizing
		width: real(),
		height: real(),
		mediaUrl: text("media_url"),
		caption: text(),
		durationMs: integer("duration_ms"),

		status: text().default("visible").notNull(), // 'visible' | 'hidden'
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("marks_space_visible_idx")
			.on(table.spaceId)
			.where(sql`${table.status} = 'visible'`),
		index("marks_author_idx").on(table.authorId),
	],
).enableRLS();

/**
 * One reaction (a ❤️ for now) by one user on one mark. `spaceId` is denormalised
 * from the mark so Realtime — whose filters are single-column — can stream a
 * whole space's reactions with `space_id=eq.<id>`. The unique index makes
 * toggling idempotent (a user can hold at most one of each emoji per mark).
 * Written server-side via Drizzle; deletes carry the full row to clients via
 * REPLICA IDENTITY FULL (set in init-policies.sql) so counts can decrement.
 */
export const markReactions = pgTable(
	"mark_reactions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		markId: uuid("mark_id")
			.notNull()
			.references(() => marks.id, { onDelete: "cascade" }),
		spaceId: uuid("space_id")
			.notNull()
			.references(() => signSpaces.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		emoji: text().default("❤️").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("mark_reactions_unique_idx").on(
			table.markId,
			table.userId,
			table.emoji,
		),
		index("mark_reactions_space_idx").on(table.spaceId),
	],
).enableRLS();

/**
 * One row per space-creation payment (₦1,000 via Paystack). Created `pending`
 * when checkout starts, flipped to `success` once verified, and consumed
 * (spaceId set) when the paid-for space is created — a reference is single-use.
 * Written only server-side via the Drizzle service connection.
 */
export const payments = pgTable(
	"payments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		reference: text().notNull(), // Paystack reference we generate (smo_…)
		email: text().notNull(),
		amount: integer().notNull(), // kobo; expected 100000 (₦1,000)
		status: text().default("pending").notNull(), // 'pending' | 'success' | 'failed'
		ownerId: uuid("owner_id"),
		// Set when the payment is consumed by creating a space — null = unused.
		spaceId: uuid("space_id").references(() => signSpaces.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("payments_reference_idx").on(table.reference),
		index("payments_owner_idx").on(table.ownerId),
	],
).enableRLS();

/**
 * One row per merchandise order. Created `pending` when the Paystack checkout
 * starts, flipped to `paid` once verified, and used to trigger fulfilment
 * emails. The reference is unique and ties the payment to the order.
 */
export const merchOrders = pgTable(
	"merch_orders",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		reference: text().notNull(),
		productId: text("product_id").notNull(),
		size: text(),
		colourId: text("colour_id").notNull(),
		qty: integer().notNull(),
		personalisation: text(),
		boardRef: text("board_ref"),
		name: text().notNull(),
		email: text().notNull(),
		phone: text().notNull(),
		address: text().notNull(),
		notes: text(),
		amount: integer().notNull(), // total in kobo
		status: text().default("pending").notNull(), // 'pending' | 'paid' | 'failed'
		ownerId: uuid("owner_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("merch_orders_reference_idx").on(table.reference),
		index("merch_orders_owner_idx").on(table.ownerId),
	],
).enableRLS();

/**
 * User feedback from the floating feedback pill. Anonymous submissions are
 * allowed; the session identity is attached server-side when present. Fully
 * server-only (like payments): RLS enabled with no policies.
 */
export const feedback = pgTable(
	"feedback",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		category: text().notNull(), // 'bug' | 'idea' | 'love' | 'other'
		message: text().notNull(),
		email: text(), // optional reply-to typed by the submitter
		userId: uuid("user_id"), // session user, when signed in
		userEmail: text("user_email"), // session email snapshot
		path: text(), // page the feedback was sent from
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [index("feedback_created_idx").on(table.createdAt)],
).enableRLS();

/** Signer profile, mirrored from auth.users via a trigger (see init-policies.sql). */
export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
}).enableRLS();
