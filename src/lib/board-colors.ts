/**
 * Board background palette — the colour of the canvas everyone signs on.
 * `bg` is the board fill; `dot` is the sketch-grid dot colour tuned for contrast
 * on that fill (dark boards get light dots). Shared by the create form, the
 * sign space, and server-side validation. Ids are stable — existing spaces
 * store the id, so don't rename `paper` / `green` / `blush` / `ink`.
 */
export type BoardColor = {
	id: string;
	label: string;
	bg: string;
	dot: string;
};

const DARK_DOT = "rgba(255,255,255,0.16)";
const LIGHT_DOT = "rgba(27,27,25,0.11)";

export const BOARD_COLORS: BoardColor[] = [
	{ id: "paper", label: "Cotton white", bg: "#fbfaf6", dot: LIGHT_DOT },
	{ id: "cream", label: "Cream", bg: "#f4ecd8", dot: LIGHT_DOT },
	{ id: "blush", label: "Blush", bg: "#f9dbe5", dot: LIGHT_DOT },
	{ id: "coral", label: "Coral", bg: "#ffd9cf", dot: LIGHT_DOT },
	{ id: "butter", label: "Butter", bg: "#fdeec0", dot: LIGHT_DOT },
	{ id: "mint", label: "Mint", bg: "#d7f0e1", dot: LIGHT_DOT },
	{ id: "sky", label: "Sky", bg: "#dceaff", dot: LIGHT_DOT },
	{ id: "lavender", label: "Lavender", bg: "#e9def9", dot: LIGHT_DOT },
	{ id: "green", label: "Naija green", bg: "#1e9e5a", dot: DARK_DOT },
	{ id: "ocean", label: "Ocean", bg: "#1f5fae", dot: DARK_DOT },
	{ id: "ink", label: "Chalkboard", bg: "#1b1b19", dot: DARK_DOT },
];

export const DEFAULT_BOARD_COLOR = BOARD_COLORS[0];

export const BOARD_COLOR_IDS = BOARD_COLORS.map((c) => c.id);

/** Resolve a stored board-colour id to its definition, falling back to paper. */
export function boardColorById(id: string | null | undefined): BoardColor {
	return BOARD_COLORS.find((c) => c.id === id) ?? DEFAULT_BOARD_COLOR;
}
