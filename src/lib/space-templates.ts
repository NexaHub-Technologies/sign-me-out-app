/**
 * Occasion presets for the create form. Picking one seeds the board colour and
 * the title/note copy so a new host isn't staring at a blank canvas. Purely a
 * client-side convenience — the values feed the existing `createSpace` inputs
 * (`boardColor`, `note`), so there's no server or schema coupling here.
 *
 * `boardColor` must be a valid id from board-colors.ts (BOARD_COLOR_IDS).
 */

export type SpaceTemplate = {
	id: string;
	label: string;
	emoji: string;
	/** A board-colour id (see board-colors.ts). */
	boardColor: string;
	/** Placeholder shown in the space-name field. */
	titlePlaceholder: string;
	/** Prefilled note for people who sign (host can edit or clear it). */
	defaultNote: string;
};

export const SPACE_TEMPLATES: SpaceTemplate[] = [
	{
		id: "blank",
		label: "Blank",
		emoji: "✍️",
		boardColor: "paper",
		titlePlaceholder: "Give your space a name e.g Sign Out Day",
		defaultNote: "",
	},
	{
		id: "graduation",
		label: "Graduation",
		emoji: "🎓",
		boardColor: "green",
		titlePlaceholder: "Class of 2026 🎓",
		defaultNote: "We made it! Drop a signature, a doodle, or a voice note 🎉",
	},
	{
		id: "farewell",
		label: "Farewell",
		emoji: "👋",
		boardColor: "sky",
		titlePlaceholder: "Bon voyage, [name]! 👋",
		defaultNote: "Sign off with a memory, a wish, or a doodle before we part.",
	},
	{
		id: "retirement",
		label: "Retirement",
		emoji: "🌴",
		boardColor: "butter",
		titlePlaceholder: "Happy retirement, [name]! 🌴",
		defaultNote: "Leave a note for the next chapter — you earned it.",
	},
	{
		id: "birthday",
		label: "Birthday",
		emoji: "🎂",
		boardColor: "blush",
		titlePlaceholder: "Happy Birthday, [name]! 🎂",
		defaultNote: "Sign the card! A wish, a doodle, or a voice note 🎉",
	},
];

export const DEFAULT_TEMPLATE = SPACE_TEMPLATES[0];

/** Resolve a template id to its preset, falling back to Blank. */
export function templateById(id: string | null | undefined): SpaceTemplate {
	return SPACE_TEMPLATES.find((t) => t.id === id) ?? DEFAULT_TEMPLATE;
}
