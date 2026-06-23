import { relations } from "drizzle-orm/relations";

import {
	canvasItems,
	exportJobs,
	orders,
	payments,
	signatures,
	signSpaces,
	spaceMemberships,
} from "./schema.ts";

export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
	order: one(orders, {
		fields: [exportJobs.orderId],
		references: [orders.id],
	}),
	signSpace: one(signSpaces, {
		fields: [exportJobs.spaceId],
		references: [signSpaces.id],
	}),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	exportJobs: many(exportJobs),
	signSpace: one(signSpaces, {
		fields: [orders.spaceId],
		references: [signSpaces.id],
	}),
	payments: many(payments),
}));

export const signSpacesRelations = relations(signSpaces, ({ many }) => ({
	exportJobs: many(exportJobs),
	orders: many(orders),
	signatures: many(signatures),
	spaceMemberships: many(spaceMemberships),
	canvasItems: many(canvasItems),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id],
	}),
}));

export const signaturesRelations = relations(signatures, ({ one }) => ({
	signSpace: one(signSpaces, {
		fields: [signatures.spaceId],
		references: [signSpaces.id],
	}),
}));

export const spaceMembershipsRelations = relations(
	spaceMemberships,
	({ one }) => ({
		signSpace: one(signSpaces, {
			fields: [spaceMemberships.spaceId],
			references: [signSpaces.id],
		}),
	}),
);

export const canvasItemsRelations = relations(canvasItems, ({ one }) => ({
	signSpace: one(signSpaces, {
		fields: [canvasItems.spaceId],
		references: [signSpaces.id],
	}),
}));
