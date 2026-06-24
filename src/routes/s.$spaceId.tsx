import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import {
	Check,
	Download,
	Link2,
	Loader2,
	Lock,
	LockOpen,
	Shirt,
} from "lucide-react";
import { lazy, useState } from "react";

import { Logo } from "#/components/logo.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ClientOnly } from "#/features/canvas/client-only.tsx";
import { getSpaceBySlug, lockSpace } from "#/server/spaces.ts";

const SignCanvas = lazy(() => import("#/features/canvas/sign-canvas.tsx"));

export const Route = createFileRoute("/s/$spaceId")({
	ssr: false,
	loader: async ({ params }) => {
		const data = await getSpaceBySlug({ data: params.spaceId });
		if (!data) throw notFound();
		return data;
	},
	component: SpacePage,
	notFoundComponent: SpaceNotFound,
});

function SpacePage() {
	const { space, marks, isHost } = Route.useLoaderData();
	const router = useRouter();
	const [copied, setCopied] = useState(false);
	const [locking, setLocking] = useState(false);
	const locked = space.status === "locked";

	async function copyLink() {
		if (typeof window === "undefined") return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			/* clipboard unavailable */
		}
	}

	async function toggleLock() {
		setLocking(true);
		try {
			await lockSpace({ data: { slug: space.slug, locked: !locked } });
			await router.invalidate();
		} finally {
			setLocking(false);
		}
	}

	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-paper-2/40">
			<header className="z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper/85 px-3 backdrop-blur-md sm:px-4">
				<div className="flex min-w-0 items-center gap-3">
					<Logo to="/dashboard" />
					<span className="hidden h-6 w-px bg-line sm:block" />
					<div className="hidden min-w-0 sm:block">
						<p className="flex items-center gap-1.5 truncate font-display text-sm font-bold text-ink">
							{space.title}
							{locked && <Lock className="size-3.5 text-ink-faint" />}
						</p>
						<p className="truncate text-xs text-ink-faint">
							/s/{space.slug} · {marks.length}{" "}
							{marks.length === 1 ? "mark" : "marks"}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={copyLink}>
						{copied ? (
							<Check className="size-4" />
						) : (
							<Link2 className="size-4" />
						)}
						<span className="hidden sm:inline">
							{copied ? "Link copied" : "Share"}
						</span>
					</Button>
					{isHost && (
						<Button
							variant="outline"
							size="sm"
							onClick={toggleLock}
							disabled={locking}
						>
							{locking ? (
								<Loader2 className="size-4 animate-spin" />
							) : locked ? (
								<LockOpen className="size-4" />
							) : (
								<Lock className="size-4" />
							)}
							<span className="hidden sm:inline">
								{locked ? "Unlock" : "Lock"}
							</span>
						</Button>
					)}
					<Button variant="outline" size="sm" disabled>
						<Download className="size-4" />
						<span className="hidden sm:inline">Export</span>
					</Button>
					<Button asChild size="sm">
						<Link to="/wear">
							<Shirt className="size-4" />
							<span className="hidden sm:inline">Wear it</span>
						</Link>
					</Button>
				</div>
			</header>

			{/* Canvas region — Konva board mounts client-side over the dotted paper. */}
			<div
				className="relative flex-1 overflow-hidden"
				style={{
					backgroundColor: "var(--paper)",
					backgroundImage:
						"radial-gradient(var(--line) 1px, transparent 1.4px)",
					backgroundSize: "26px 26px",
				}}
			>
				<ClientOnly>
					{() => (
						<SignCanvas
							space={{ id: space.id, slug: space.slug, status: space.status }}
							initialMarks={marks}
							isHost={isHost}
						/>
					)}
				</ClientOnly>
			</div>
		</div>
	);
}

function SpaceNotFound() {
	return (
		<div className="grid min-h-screen place-items-center px-6 text-center">
			<div>
				<Logo />
				<h1 className="font-display mt-6 text-3xl font-extrabold text-ink">
					This space doesn't exist
				</h1>
				<p className="mt-2 text-ink-soft">
					The link may be wrong, or the board was removed.
				</p>
				<Button asChild className="mt-6 rounded-full">
					<Link to="/create">Create your own space</Link>
				</Button>
			</div>
		</div>
	);
}
