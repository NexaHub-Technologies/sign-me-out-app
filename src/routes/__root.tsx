import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { FeedbackFab } from "#/features/feedback/feedback-fab.tsx";
import { pageMeta } from "#/lib/seo.ts";
import appCss from "../styles.css?url";

// Variable-weight ranges: one file per family instead of one per weight.
const FONTS_HREF =
	"https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Manrope:wght@400..800&family=Caveat:wght@500..700&display=swap";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			// Site-wide defaults (title + description + OG/Twitter). Deeper routes
			// override these by re-emitting the same title / meta keys.
			...pageMeta({
				title: "Sign Me Out — your sign-out, signed by everyone",
				description:
					"The last paper is done. Open a sign-out canvas, share one link, and let coursemates, classmates and loved ones leave signatures, doodles, photos and voice notes. Print it, save a PDF, or wear it.",
				path: "/",
			}),
			{
				name: "theme-color",
				content: "#f6f8fc",
			},
		],
		links: [
			// Fonts load from <head> rather than an @import inside styles.css, so
			// the browser discovers them in parallel with the app stylesheet
			// instead of only after downloading and parsing it.
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{ rel: "stylesheet", href: FONTS_HREF },
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/logo.svg",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	component: RootComponent,
});

// Inside router context (unlike the document shell), so the feedback pill can
// read the current route and dodge the canvas tool dock.
function RootComponent() {
	return (
		<>
			<Outlet />
			<FeedbackFab />
		</>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						// bottom-right belongs to the feedback pill
						position: "bottom-left",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
