import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();

	function onSubmit(e: FormEvent) {
		e.preventDefault();
		// TODO: authenticate, then go to the dashboard.
		navigate({ to: "/dashboard" });
	}

	return (
		<div>
			<h1 className="font-display text-3xl font-extrabold text-ink">
				Welcome back
			</h1>
			<p className="mt-2 text-[15px] text-ink-soft">
				Log in to manage your sign-out spaces.
			</p>

			<form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
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
				<Button type="submit" size="lg" className="mt-1 w-full rounded-full">
					Log in
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
