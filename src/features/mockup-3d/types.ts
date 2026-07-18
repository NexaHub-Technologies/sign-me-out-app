/** Shared prop shape every product mockup component takes. */
export type MockupProps = {
	/** The board's rasterized PNG (or null while it's still capturing). */
	imageUrl: string | null;
	/** Garment/product colour hex, from the customize page's colour picker. */
	color: string;
};

/**
 * Self-hosted Draco decoder (copied from three/examples/jsm/libs/draco/gltf
 * into public/draco/ — see the Draco compression setup) — every product's
 * glb was compressed with `gltf-transform optimize --compress draco`, so
 * every useGLTF() call needs this to decode the mesh geometry.
 */
export const DRACO_DECODER_PATH = "/draco/";
