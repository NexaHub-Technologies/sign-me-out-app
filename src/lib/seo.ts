/**
 * Small SEO helper for building per-page <head> meta — title, description, and
 * Open Graph / Twitter card tags — so a shared link unfurls with a real title
 * and preview image in WhatsApp, Slack, iMessage, X, etc.
 *
 * Set VITE_SITE_URL to your production origin (e.g. https://sign-me-out.app) so
 * og:image and og:url resolve to absolute URLs — social scrapers require them.
 */

const RAW_SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://sign-me-out.app";
/** Canonical origin, no trailing slash. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

export const SITE_NAME = "Sign Me Out";

/** Default share image. Swap for a dedicated 1200×630 /og.png when you have one. */
const DEFAULT_OG_IMAGE = "/images/tee.png";

/** Resolve a site-relative path to an absolute URL (og tags need absolute). */
export function absoluteUrl(path = "/"): string {
	if (/^https?:\/\//.test(path)) return path;
	return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type MetaTag =
	| { title: string }
	| { name: string; content: string }
	| { property: string; content: string };

export type PageMetaInput = {
	title: string;
	description: string;
	/** Site-relative path or absolute URL for og:image. */
	image?: string;
	/** Site-relative path of the current page, for og:url / canonical. */
	path?: string;
};

/**
 * Build the meta array for a route's `head`. The title is passed through
 * verbatim (deepest matching route wins in TanStack Router); the og and
 * twitter tags mirror it so link previews match the page.
 */
export function pageMeta({
	title,
	description,
	image = DEFAULT_OG_IMAGE,
	path,
}: PageMetaInput): MetaTag[] {
	const ogImage = absoluteUrl(image);
	const tags: MetaTag[] = [
		{ title },
		{ name: "description", content: description },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:type", content: "website" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:image", content: ogImage },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: ogImage },
	];
	if (path) {
		tags.push({ property: "og:url", content: absoluteUrl(path) });
	}
	return tags;
}
