/** Shared prop shape every product mockup component takes. */
export type MockupProps = {
	/** The board's rasterized PNG (or null while it's still capturing). */
	imageUrl: string | null;
	/** Garment/product colour hex, from the customize page's colour picker. */
	color: string;
};
