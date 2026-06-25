import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { BOARD_COLORS, boardColorById } from "#/lib/board-colors.ts";
import { cn } from "#/lib/utils.ts";
import { initSpacePayment } from "#/server/payments.ts";
import { fetchSessionUser } from "#/server/session.ts";
import { createSpace } from "#/server/spaces.ts";

export const Route = createFileRoute("/_app/create")({
	// Opening a space is paid, so it requires a signed-in account.
	beforeLoad: async () => {
		const user = await fetchSessionUser();
		if (!user) {
			throw redirect({ to: "/login", search: { next: "/create" } });
		}
	},
	component: CreatePage,
});

function CreatePage() {
	const navigate = useNavigate();
	const [color, setColor] = useState("paper");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);
		const title = String(form.get("title") ?? "").trim();
		const note = String(form.get("note") ?? "");
		if (!title) {
			setError("A space name is required");
			return;
		}
		setSubmitting(true);

		try {
			// 1. Start the ₦1,000 transaction server-side (amount is fixed there).
			const { accessCode, reference } = await initSpacePayment();

			// 2. Open the Paystack popup. Imported lazily so SSR never touches it.
			const { default: PaystackPop } = await import("@paystack/inline-js");
			const popup = new PaystackPop();
			popup.resumeTransaction(accessCode, {
				// 3. Payment confirmed — createSpace re-verifies the reference, then inserts.
				onSuccess: async () => {
					try {
						const { slug } = await createSpace({
							data: {
								title,
								note,
								boardColor: color,
								paymentReference: reference,
							},
						});
						navigate({ to: "/s/$spaceId", params: { spaceId: slug } });
					} catch (err) {
						setError(
							err instanceof Error
								? err.message
								: "Payment went through but the space couldn't be created — try again.",
						);
						setSubmitting(false);
					}
				},
				onCancel: () => {
					setError("Payment cancelled — your space wasn't created.");
					setSubmitting(false);
				},
				onError: (err: { message?: string }) => {
					setError(err?.message || "Payment failed. Please try again.");
					setSubmitting(false);
				},
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not start payment");
			setSubmitting(false);
		}
	}

	return (
		<div className="page-wrap max-w-2xl py-14">
			<p className="kicker">New sign-out space</p>
			<h1 className="font-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
				Name your board, then start signing.
			</h1>
			<p className="mt-3 text-lg text-ink-soft">
				A one-time ₦1,000 opens your space. The people who sign it never pay.
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
					<legend className="mb-1 text-sm font-medium text-ink">
						Board colour
					</legend>
					<div className="flex flex-wrap gap-2.5">
						{BOARD_COLORS.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => setColor(c.id)}
								title={c.label}
								aria-label={c.label}
								aria-pressed={color === c.id}
								className={cn(
									"size-9 rounded-full border transition-transform",
									color === c.id
										? "border-transparent ring-2 ring-marker-green ring-offset-2 ring-offset-paper"
										: "border-line hover:scale-110",
								)}
								style={{ backgroundColor: c.bg }}
							/>
						))}
					</div>
					<p className="text-sm text-ink-soft">{boardColorById(color).label}</p>
				</fieldset>

				{error && (
					<p className="text-sm font-medium text-destructive">{error}</p>
				)}

				<div className="flex flex-col gap-2">
					<Button
						type="submit"
						size="lg"
						className="pop w-fit rounded-full"
						disabled={submitting}
					>
						{submitting ? (
							<>
								<Loader2 className="size-4 animate-spin" /> Processing…
							</>
						) : (
							<>
								Pay ₦1,000 &amp; open the canvas{" "}
								<ArrowRight className="size-4" />
							</>
						)}
					</Button>
					<p className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
						<Lock className="size-3" /> Secure payment by Paystack. You'll only
						be charged once the space opens.
					</p>
				</div>
			</form>
		</div>
	);
}
