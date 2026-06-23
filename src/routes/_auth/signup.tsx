import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";

export const Route = createFileRoute("/_auth/signup")({
	component: SignupPage,
});

function SignupPage() {
	const navigate = useNavigate();

	function onSubmit(e: FormEvent) {
		e.preventDefault();
		// TODO: create account, then send them to name their first space.
		navigate({ to: "/create" });
	}

	return (
		<div>
			<h1 className="font-display text-3xl font-extrabold text-ink">
				Create your space
			</h1>
			<p className="mt-2 text-[15px] text-ink-soft">
				Start free. You'll have a board ready in a minute.
			</p>

			<form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
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
						placeholder="At least 8 characters"
						autoComplete="new-password"
						className="h-11 bg-card"
					/>
				</div>
				<Button type="submit" size="lg" className="mt-1 w-full rounded-full">
					Create my space
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
