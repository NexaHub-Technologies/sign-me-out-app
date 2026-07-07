import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { pageMeta } from "#/lib/seo.ts";
import appCss from "../styles.css?url";

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
});

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
						position: "bottom-right",
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
