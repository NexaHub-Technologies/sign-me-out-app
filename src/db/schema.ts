import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

export const garments = pgTable("garments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
	availableSizes: text("available_sizes")
		.array()
		.default(["S", "M", "L", "XL"])
		.notNull(),
	imageUrl: text("image_url"),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
}).enableRLS();

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	fullName: text("full_name").notNull(),
	phone: text(),
	campus: text(),
	avatarUrl: text("avatar_url"),
	role: text().default("student").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
}).enableRLS();

export const signSpaces = pgTable(
	"sign_spaces",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		hostId: uuid("host_id").notNull(),
		title: text().notNull(),
		slug: text().notNull(),
		occasion: text().default("other").notNull(),
		visibility: text().default("invite_only").notNull(),
		status: text().default("pending_payment").notNull(),
		maxSignatures: integer("max_signatures").default(150).notNull(),
		openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }),
		lockedAt: timestamp("locked_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_sign_spaces_host").using(
			"btree",
			table.hostId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_sign_spaces_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		unique("sign_spaces_slug_unique").on(table.slug),
	],
).enableRLS();

export const exportJobs = pgTable(
	"export_jobs",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		spaceId: uuid("space_id").notNull(),
		orderId: uuid("order_id"),
		requestedBy: uuid("requested_by").notNull(),
		format: text().notNull(),
		status: text().default("pending").notNull(),
		fileUrl: text("file_url"),
		failureReason: text("failure_reason"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_export_jobs_space").using(
			"btree",
			table.spaceId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_export_jobs_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "export_jobs_order_id_orders_id_fk",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.spaceId],
			foreignColumns: [signSpaces.id],
			name: "export_jobs_space_id_sign_spaces_id_fk",
		}).onDelete("cascade"),
	],
).enableRLS();

export const orders = pgTable(
	"orders",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		spaceId: uuid("space_id").notNull(),
		userId: uuid("user_id").notNull(),
		kind: text().notNull(),
		amount: numeric({ precision: 12, scale: 2 }).notNull(),
		currency: text().default("NGN").notNull(),
		status: text().default("pending_payment").notNull(),
		paymentRef: text("payment_ref"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_orders_space").using(
			"btree",
			table.spaceId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_orders_status").using(
			"btree",
			table.status.asc().nullsLast().op("text_ops"),
		),
		index("idx_orders_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.spaceId],
			foreignColumns: [signSpaces.id],
			name: "orders_space_id_sign_spaces_id_fk",
		}).onDelete("restrict"),
	],
).enableRLS();

export const payments = pgTable(
	"payments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		orderId: uuid("order_id").notNull(),
		provider: text().default("paystack").notNull(),
		reference: text().notNull(),
		amount: numeric({ precision: 12, scale: 2 }).notNull(),
		status: text().default("initiated").notNull(),
		rawPayload: jsonb("raw_payload"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_payments_order").using(
			"btree",
			table.orderId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "payments_order_id_orders_id_fk",
		}).onDelete("restrict"),
		unique("payments_reference_unique").on(table.reference),
	],
).enableRLS();

export const signatures = pgTable(
	"signatures",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		spaceId: uuid("space_id").notNull(),
		authorId: uuid("author_id"),
		authorName: text("author_name").notNull(),
		kind: text().notNull(),
		content: jsonb().notNull(),
		uvX: real("uv_x").notNull(),
		uvY: real("uv_y").notNull(),
		rotation: real().default(0).notNull(),
		scale: real().default(1).notNull(),
		color: text().default("#111111").notNull(),
		status: text().default("visible").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_signatures_author").using(
			"btree",
			table.authorId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_signatures_space")
			.using("btree", table.spaceId.asc().nullsLast().op("uuid_ops"))
			.where(sql`(status = 'visible'::text)`),
		foreignKey({
			columns: [table.spaceId],
			foreignColumns: [signSpaces.id],
			name: "signatures_space_id_sign_spaces_id_fk",
		}).onDelete("cascade"),
	],
).enableRLS();

export const spaceMemberships = pgTable(
	"space_memberships",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		spaceId: uuid("space_id").notNull(),
		userId: uuid("user_id"),
		displayName: text("display_name"),
		invitedEmail: text("invited_email"),
		role: text().notNull(),
		status: text().default("invited").notNull(),
		invitedAt: timestamp("invited_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }),
	},
	(table) => [
		index("idx_memberships_space").using(
			"btree",
			table.spaceId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_memberships_user").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.spaceId],
			foreignColumns: [signSpaces.id],
			name: "space_memberships_space_id_sign_spaces_id_fk",
		}).onDelete("cascade"),
	],
).enableRLS();

export const canvasItems = pgTable(
	"canvas_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		spaceId: uuid("space_id").notNull(),
		authorId: uuid("author_id"),
		authorName: text("author_name").notNull(),
		kind: text().notNull(),
		posX: real("pos_x").default(0).notNull(),
		posY: real("pos_y").default(0).notNull(),
		rotation: real().default(0).notNull(),
		scale: real().default(1).notNull(),
		strokePoints: jsonb("stroke_points"),
		strokeColor: text("stroke_color").default("#111111"),
		strokeWidth: real("stroke_width").default(4),
		textContent: text("text_content"),
		fontSize: real("font_size").default(24),
		textColor: text("text_color").default("#111111"),
		momentUrl: text("moment_url"),
		momentCaption: text("moment_caption"),
		momentWidth: real("moment_width").default(200),
		momentHeight: real("moment_height").default(200),
		status: text().default("visible").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_canvas_items_author").using(
			"btree",
			table.authorId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_canvas_items_space")
			.using("btree", table.spaceId.asc().nullsLast().op("uuid_ops"))
			.where(sql`(status = 'visible'::text)`),
		foreignKey({
			columns: [table.spaceId],
			foreignColumns: [signSpaces.id],
			name: "canvas_items_space_id_sign_spaces_id_fk",
		}).onDelete("cascade"),
	],
).enableRLS();
