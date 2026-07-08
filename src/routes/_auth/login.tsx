import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, useState } from "react";

import { signInWithGoogle } from "#/features/auth/actions.ts";
import { GoogleButton } from "#/features/auth/google-button.tsx";

export const Route = createFileRoute("/_auth/login")({
	// `next` is optional — return it only when present so it stays an optional
	// search param (otherwise every <Link to="/login"> would be forced to pass it).
	validateSearch: (search: Record<string, unknown>): { next?: string } => {
		const next = typeof search.next === "string" ? search.next : undefined;
		return next ? { next } : {};
	},
	component: LoginPage,
});

function LoginPage() {
	const { next } = Route.useSearch();
	const dest = next ?? "/dashboard";
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onGoogle() {
		setError(null);
		setBusy(true);
		const err = await signInWithGoogle(dest);
		if (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<div>
			<span className="inline-flex rotate-[-2deg] items-center rounded-full bg-marker-blue-deep/10 px-3 py-1 text-xs font-bold text-marker-blue-deep">
				good to see you 👋
			</span>
			<h1 className="font-display mt-4 text-4xl font-extrabold text-ink">
				Welcome{" "}
				<span
					className="hl"
					style={{ "--hl": "var(--marker-blue)" } as CSSProperties}
				>
					back
				</span>
			</h1>
			<p className="mt-3 text-[15px] text-ink-soft">
				Log in to manage your sign-out spaces.
			</p>

			<div className="mt-7">
				<GoogleButton
					label="Continue with Google"
					onClick={onGoogle}
					disabled={busy}
				/>
			</div>

			<p className="mt-3 text-center text-xs text-ink-faint">
				We only use Google sign-in — no passwords to remember.
			</p>

			{error && (
				<p className="mt-4 text-sm font-medium text-destructive">{error}</p>
			)}

			<p className="mt-6 text-center text-sm text-ink-soft">
				New here?{" "}
				<Link to="/signup" className="font-semibold text-marker-blue-deep">
					Create your space
				</Link>
			</p>
		</div>
	);
}
