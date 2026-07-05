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
	priceKobo: number;
};

export const PRODUCTS: Product[] = [
	{
		id: "tee",
		name: "Sign-out tee",
		group: "Wear",
		sizes: true,
		priceKobo: 1_200_000,
	},
	{
		id: "hoodie",
		name: "Heavy hoodie",
		group: "Wear",
		sizes: true,
		priceKobo: 2_000_000,
	},
	{
		id: "sweatshirt",
		name: "Crew sweatshirt",
		group: "Wear",
		sizes: true,
		priceKobo: 1_200_000,
	},
	{
		id: "tote",
		name: "Tote bag",
		group: "Wear",
		sizes: false,
		priceKobo: 1_000_000,
	},
	{ id: "cap", name: "Cap", group: "Wear", sizes: false, priceKobo: 800_000 },
	{
		id: "framed",
		name: "Framed print",
		group: "Wear",
		sizes: false,
		priceKobo: 3_700_000,
	},
	{
		id: "mug",
		name: "Mug",
		group: "Souvenirs",
		sizes: false,
		priceKobo: 800_000,
	},
	{
		id: "cup",
		name: "Travel cup",
		group: "Souvenirs",
		sizes: false,
		priceKobo: 800_000,
	},
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

export function formatPrice(kobo: number): string {
	return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}
