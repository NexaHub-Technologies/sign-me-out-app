import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { signInWithGoogle } from "#/features/auth/actions.ts";
import { GoogleButton } from "#/features/auth/google-button.tsx";
import { getSupabaseBrowserClient } from "#/lib/supabase.ts";

export const Route = createFileRoute("/_auth/signup")({
	component: SignupPage,
});

function SignupPage() {
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setNotice(null);
		setBusy(true);
		const form = new FormData(e.currentTarget);
		const sb = getSupabaseBrowserClient();
		const { data, error } = await sb.auth.signUp({
			email: String(form.get("email") ?? ""),
			password: String(form.get("password") ?? ""),
			options: { data: { full_name: String(form.get("name") ?? "") } },
		});
		if (error) {
			setError(error.message);
			setBusy(false);
		} else if (!data.session) {
			// email confirmation is on — no session yet
			setNotice("Check your email to confirm your account, then log in.");
			setBusy(false);
		} else {
			navigate({ to: "/create" });
		}
	}

	async function onGoogle() {
		setError(null);
		setNotice(null);
		setBusy(true);
		const err = await signInWithGoogle("/create");
		if (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<div>
			<h1 className="font-display text-3xl font-extrabold text-ink">
				Create your space
			</h1>
			<p className="mt-2 text-[15px] text-ink-soft">
				Start free. You'll have a board ready in a minute.
			</p>

			<div className="mt-7">
				<GoogleButton
					label="Sign up with Google"
					onClick={onGoogle}
					disabled={busy}
				/>
			</div>

			<div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
				<span className="h-px flex-1 bg-line" /> or{" "}
				<span className="h-px flex-1 bg-line" />
			</div>

			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="name">Full name</Label>
					<Input
						id="name"
						name="name"
						required
						placeholder="Ada Obi"
						autoComplete="name"
						className="h-11 bg-card"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						required
						placeholder="you@school.edu.ng"
						autoComplete="email"
						className="h-11 bg-card"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						required
						placeholder="At least 6 characters"
						autoComplete="new-password"
						className="h-11 bg-card"
					/>
				</div>

				{error && (
					<p className="text-sm font-medium text-destructive">{error}</p>
				)}
				{notice && (
					<p className="text-sm font-medium text-marker-green-deep">{notice}</p>
				)}

				<Button
					type="submit"
					size="lg"
					className="mt-1 w-full rounded-full"
					disabled={busy}
				>
					{busy ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						"Create my space"
					)}
				</Button>
			</form>

			<p className="mt-6 text-center text-sm text-ink-soft">
				Already signed up?{" "}
				<Link to="/login" className="font-semibold text-marker-green-deep">
					Log in
				</Link>
			</p>
		</div>
	);
}
