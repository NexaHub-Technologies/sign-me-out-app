import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { type CSSProperties, type FormEvent, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { signInWithGoogle } from "#/features/auth/actions.ts";
import { GoogleButton } from "#/features/auth/google-button.tsx";
import { getSupabaseBrowserClient } from "#/lib/supabase.ts";

export const Route = createFileRoute("/_auth/login")({
	validateSearch: (search: Record<string, unknown>) => ({
		next: typeof search.next === "string" ? search.next : undefined,
	}),
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const { next } = Route.useSearch();
	const dest = next ?? "/dashboard";
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		const form = new FormData(e.currentTarget);
		const sb = getSupabaseBrowserClient();
		const { error } = await sb.auth.signInWithPassword({
			email: String(form.get("email") ?? ""),
			password: String(form.get("password") ?? ""),
		});
		if (error) {
			setError(error.message);
			setBusy(false);
		} else {
			navigate({ to: dest });
		}
	}

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
			<span className="inline-flex rotate-[-2deg] items-center rounded-full bg-marker-green-deep/10 px-3 py-1 text-xs font-bold text-marker-green-deep">
				good to see you 👋
			</span>
			<h1 className="font-display mt-4 text-4xl font-extrabold text-ink">
				Welcome{" "}
				<span
					className="hl"
					style={{ "--hl": "var(--marker-green)" } as CSSProperties}
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

			<div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
				<span className="h-px flex-1 bg-line" /> or{" "}
				<span className="h-px flex-1 bg-line" />
			</div>

			<form onSubmit={onSubmit} className="flex flex-col gap-4">
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
					<div className="flex items-center justify-between">
						<Label htmlFor="password">Password</Label>
						<button
							type="button"
							className="text-xs font-medium text-marker-green-deep"
						>
							Forgot?
						</button>
					</div>
					<Input
						id="password"
						name="password"
						type="password"
						required
						placeholder="Your password"
						autoComplete="current-password"
						className="h-11 bg-card"
					/>
				</div>

				{error && (
					<p className="text-sm font-medium text-destructive">{error}</p>
				)}

				<Button
					type="submit"
					size="lg"
					className="mt-1 w-full rounded-full"
					disabled={busy}
				>
					{busy ? <Loader2 className="size-4 animate-spin" /> : "Log in"}
				</Button>
			</form>

			<p className="mt-6 text-center text-sm text-ink-soft">
				New here?{" "}
				<Link to="/signup" className="font-semibold text-marker-green-deep">
					Create your space
				</Link>
			</p>
		</div>
	);
}
