import { relations } from "drizzle-orm/relations";

import { marks, signSpaces } from "./schema.ts";

export const signSpacesRelations = relations(signSpaces, ({ many }) => ({
	marks: many(marks),
}));

export const marksRelations = relations(marks, ({ one }) => ({
	space: one(signSpaces, {
		fields: [marks.spaceId],
		references: [signSpaces.id],
	}),
}));
