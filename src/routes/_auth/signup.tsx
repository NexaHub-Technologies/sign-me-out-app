import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, useState } from "react";

import { signInWithGoogle } from "#/features/auth/actions.ts";
import { GoogleButton } from "#/features/auth/google-button.tsx";

export const Route = createFileRoute("/_auth/signup")({
	component: SignupPage,
});

function SignupPage() {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onGoogle() {
		setError(null);
		setBusy(true);
		const err = await signInWithGoogle("/create");
		if (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<div>
			<span className="inline-flex rotate-[-2deg] items-center rounded-full bg-marker-pink/10 px-3 py-1 text-xs font-bold text-marker-pink">
				let's get you signed out 🎉
			</span>
			<h1 className="font-display mt-4 text-4xl font-extrabold text-ink">
				Create your{" "}
				<span
					className="hl"
					style={{ "--hl": "var(--marker-pink)" } as CSSProperties}
				>
					space
				</span>
			</h1>
			<p className="mt-3 text-[15px] text-ink-soft">
				Start free. You'll have a board ready in a minute.
			</p>

			<div className="mt-7">
				<GoogleButton
					label="Sign up with Google"
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
				Already signed up?{" "}
				<Link to="/login" className="font-semibold text-marker-blue-deep">
					Log in
				</Link>
			</p>
		</div>
	);
}
