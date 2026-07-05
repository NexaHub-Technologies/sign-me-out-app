import { Loader2, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { signInWithGoogle } from "#/features/auth/actions.ts";
import { GoogleButton } from "#/features/auth/google-button.tsx";
import { getSupabaseBrowserClient } from "#/lib/supabase.ts";

export function SignInDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [mode, setMode] = useState<"login" | "signup">("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
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

	async function onEmailSubmit(e: FormEvent) {
		e.preventDefault();
		setBusy(true);
		setMessage(null);
		const sb = getSupabaseBrowserClient();
		if (mode === "signup") {
			const { data, error } = await sb.auth.signUp({ email, password });
			if (error) setMessage(error.message);
			else if (!data.session)
				setMessage("Check your email to confirm, then log in.");
			else onClose();
		} else {
			const { error } = await sb.auth.signInWithPassword({ email, password });
			if (error) setMessage(error.message);
			else onClose();
		}
		setBusy(false);
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

				<div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
					<span className="h-px flex-1 bg-line" /> or{" "}
					<span className="h-px flex-1 bg-line" />
				</div>

				<form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="si-email">Email</Label>
						<Input
							id="si-email"
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@school.edu.ng"
							className="bg-card"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="si-pw">Password</Label>
						<Input
							id="si-pw"
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="At least 6 characters"
							className="bg-card"
						/>
					</div>
					<Button
						type="submit"
						className="mt-1 w-full rounded-full"
						disabled={busy}
					>
						{busy ? (
							<Loader2 className="size-4 animate-spin" />
						) : mode === "login" ? (
							"Log in"
						) : (
							"Sign up"
						)}
					</Button>
				</form>

				{message && (
					<p className="mt-3 text-center text-sm text-ink-soft">{message}</p>
				)}

				<p className="mt-4 text-center text-sm text-ink-soft">
					{mode === "login" ? "New here?" : "Already have an account?"}{" "}
					<button
						type="button"
						className="font-semibold text-marker-blue-deep"
						onClick={() => {
							setMode(mode === "login" ? "signup" : "login");
							setMessage(null);
						}}
					>
						{mode === "login" ? "Create an account" : "Log in"}
					</button>
				</p>
			</div>
		</div>
	);
}
