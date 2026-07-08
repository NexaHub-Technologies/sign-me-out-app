import { X } from "lucide-react";
import { useState } from "react";

import { signInWithGoogle } from "#/features/auth/actions.ts";
import { GoogleButton } from "#/features/auth/google-button.tsx";

export function SignInDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	if (!open) return null;

	async function continueWithGoogle() {
		setBusy(true);
		const err = await signInWithGoogle(location.pathname);
		if (err) {
			setMessage(err);
			setBusy(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 grid place-items-center p-4">
			<button
				type="button"
				aria-label="Close"
				className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="paper-card relative z-10 w-full max-w-sm rounded-2xl p-6">
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="absolute right-4 top-4 text-ink-faint hover:text-ink"
				>
					<X className="size-5" />
				</button>

				<h2 className="font-display text-2xl font-extrabold text-ink">
					Sign in to leave your mark
				</h2>
				<p className="mt-1 text-sm text-ink-soft">
					Your signature is saved under your name.
				</p>

				<div className="mt-5">
					<GoogleButton
						label="Continue with Google"
						onClick={continueWithGoogle}
						disabled={busy}
					/>
				</div>

				<p className="mt-3 text-center text-xs text-ink-faint">
					We only use Google sign-in — no passwords to remember.
				</p>

				{message && (
					<p className="mt-3 text-center text-sm text-ink-soft">{message}</p>
				)}
			</div>
		</div>
	);
}
