import type { marks } from "#/db/schema.ts";

/** A persisted canvas element (row from the marks table). */
export type Mark = typeof marks.$inferSelect;

export type StrokePoint = { x: number; y: number; pressure: number };

export type ToolId = "pen" | "text" | "photo" | "voice" | "move" | "eraser";

/**
 * Marker colors as literal hex — Konva draws to a <canvas> and cannot resolve
 * CSS custom properties, so these must be concrete values (matching styles.css).
 */
export const MARKER_COLORS = [
	{ id: "ink", value: "#1b1b19" },
	{ id: "green", value: "#15784a" },
	{ id: "pink", value: "#e84b7a" },
	{ id: "blue", value: "#2f6be6" },
	{ id: "amber", value: "#f2a33c" },
] as const;

export type MarkerColorId = (typeof MARKER_COLORS)[number]["id"];
