import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_app/create")({
	component: CreatePage,
});

const boardColors = [
	{ id: "paper", label: "Cotton white", swatch: "#fbfaf6" },
	{ id: "green", label: "Naija green", swatch: "#1e9e5a" },
	{ id: "blush", label: "Blush", swatch: "#f7d6e0" },
	{ id: "ink", label: "Chalkboard", swatch: "#1b1b19" },
];

function CreatePage() {
	const navigate = useNavigate();
	const [color, setColor] = useState("paper");

	function onSubmit(e: FormEvent) {
		e.preventDefault();
		// TODO: create the space in the DB and use its real id.
		const id = `space-${Math.random().toString(36).slice(2, 8)}`;
		navigate({ to: "/s/$spaceId", params: { spaceId: id } });
	}

	return (
		<div className="page-wrap max-w-2xl py-14">
			<p className="kicker">New sign-out space</p>
			<h1 className="font-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
				Name your board, then start signing.
			</h1>
			<p className="mt-3 text-lg text-ink-soft">
				You can change everything later — let's get you a canvas first.
			</p>

			<form onSubmit={onSubmit} className="mt-10 flex flex-col gap-7">
				<div className="flex flex-col gap-2">
					<Label htmlFor="title">Space name</Label>
					<Input
						id="title"
						name="title"
						required
						placeholder="e.g. CSC Class of 2026"
						className="h-12 bg-card text-base"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="note">A note for people who sign (optional)</Label>
					<Textarea
						id="note"
						name="note"
						rows={3}
						placeholder="Drop a line and a doodle — we made it! 🎓"
						className="resize-none bg-card text-base"
					/>
				</div>

				<fieldset className="flex flex-col gap-3">
					<legend className="mb-3 text-sm font-medium text-ink">
						Board colour
					</legend>
					<div className="flex flex-wrap gap-3">
						{boardColors.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => setColor(c.id)}
								className={cn(
									"flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
									color === c.id
										? "border-marker-green bg-marker-green-deep/[0.06] text-ink"
										: "border-line bg-card text-ink-soft hover:border-line-strong",
								)}
								aria-pressed={color === c.id}
							>
								<span
									className="size-5 rounded-full border border-line"
									style={{ backgroundColor: c.swatch }}
								/>
								{c.label}
							</button>
						))}
					</div>
				</fieldset>

				<Button type="submit" size="lg" className="w-fit rounded-full">
					Open the canvas <ArrowRight className="size-4" />
				</Button>
			</form>
		</div>
	);
}
