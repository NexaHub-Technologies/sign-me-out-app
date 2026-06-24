import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
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
		hostToken: uuid("host_token").notNull(),
		// The authenticated creator, when signed in — lets a host see their spaces
		// across devices. Null for spaces created by a cookie-only (anonymous) host.
		ownerId: uuid("owner_id"),
		status: text().default("open").notNull(), // 'open' | 'locked'
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

/** Signer profile, mirrored from auth.users via a trigger (see init-policies.sql). */
export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
}).enableRLS();
