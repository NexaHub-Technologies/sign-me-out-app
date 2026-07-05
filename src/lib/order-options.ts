/**
 * The customise-and-order catalogue. Shared between the /customize page and
 * the order server fns so the server validates against the same options the
 * UI offers. Keep this module dependency-free — it's imported by the browser.
 */

export type Product = {
	id: string;
	name: string;
	group: "Wear" | "Souvenirs";
	sizes: boolean;
};

export const PRODUCTS: Product[] = [
	{ id: "tee", name: "Sign-out tee", group: "Wear", sizes: true },
	{ id: "hoodie", name: "Heavy hoodie", group: "Wear", sizes: true },
	{ id: "sweatshirt", name: "Crew sweatshirt", group: "Wear", sizes: true },
	{ id: "tote", name: "Tote bag", group: "Wear", sizes: false },
	{ id: "cap", name: "Cap", group: "Wear", sizes: false },
	{ id: "framed", name: "Framed print", group: "Wear", sizes: false },
	{ id: "mug", name: "Mug", group: "Souvenirs", sizes: false },
	{ id: "cup", name: "Travel cup", group: "Souvenirs", sizes: false },
	{ id: "wristband", name: "Wristband", group: "Souvenirs", sizes: false },
	{ id: "keychain", name: "Key chain", group: "Souvenirs", sizes: false },
];

export const COLOURS = [
	{ id: "white", label: "Cotton white", swatch: "#fbfaf6" },
	{ id: "green", label: "Naija green", swatch: "#1e9e5a" },
	{ id: "pink", label: "Pink", swatch: "#e84b7a" },
	{ id: "blue", label: "Blue", swatch: "#2f6be6" },
	{ id: "amber", label: "Amber", swatch: "#f2a33c" },
	{ id: "black", label: "Chalk black", swatch: "#1b1b19" },
];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const MAX_QTY = 500;
