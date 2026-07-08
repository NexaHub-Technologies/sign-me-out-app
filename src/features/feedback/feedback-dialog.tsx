import { Bug, Heart, Lightbulb, Loader2, MessageCircle, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { cn } from "#/lib/utils.ts";
import { sendFeedback } from "#/server/feedback.ts";

// Mirrors FEEDBACK_CATEGORIES in server/feedback-core.ts (the authoritative
// whitelist) — kept apart so this client module never imports server code.
const CATEGORIES = [
	{ id: "bug", label: "Bug", Icon: Bug },
	{ id: "idea", label: "Idea", Icon: Lightbulb },
	{ id: "love", label: "Love it", Icon: Heart },
	{ id: "other", label: "Other", Icon: MessageCircle },
] as const;

export function FeedbackDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [category, setCategory] = useState<string>("idea");
	const [message, setMessage] = useState("");
	const [email, setEmail] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState(false);

	// Reset to a fresh form each time the dialog opens.
	useEffect(() => {
		if (!open) return;
		setCategory("idea");
		setMessage("");
		setEmail("");
		setError(null);
		setSent(false);
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		if (!message.trim()) {
			setError("Tell us what's on your mind");
			return;
		}
		setBusy(true);
		try {
			await sendFeedback({
				data: {
					category,
					message,
					email,
					path: window.location.pathname,
				},
			});
			setSent(true);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Couldn't send that just now — please try again.",
			);
		} finally {
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
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Send feedback"
				className="paper-card relative z-10 w-full max-w-sm rounded-2xl p-6"
			>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="absolute right-4 top-4 text-ink-faint hover:text-ink"
				>
					<X className="size-5" />
				</button>

				{sent ? (
					<div className="flex flex-col items-center py-4 text-center">
						<p className="scrawl text-3xl text-marker-blue-deep">Thank you!</p>
						<p className="mt-2 text-sm text-ink-soft">
							We read every one — it genuinely shapes what we build next.
						</p>
						<Button className="mt-5 rounded-full px-6" onClick={onClose}>
							Close
						</Button>
					</div>
				) : (
					<>
						<h2 className="font-display text-2xl font-extrabold text-ink">
							Send feedback
						</h2>
						<p className="mt-1 text-sm text-ink-soft">
							Spotted a bug? Got an idea? Scrawl it here.
						</p>

						<form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
							<fieldset className="flex flex-col gap-2">
								<legend className="mb-1 text-sm font-medium text-ink">
									What's it about?
								</legend>
								<div className="flex flex-wrap gap-2">
									{CATEGORIES.map(({ id, label, Icon }) => (
										<button
											key={id}
											type="button"
											onClick={() => setCategory(id)}
											aria-pressed={category === id}
											className={cn(
												"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
												category === id
													? "border-transparent bg-marker-blue/10 text-marker-blue-deep ring-2 ring-marker-blue"
													: "border-line text-ink-soft hover:text-ink",
											)}
										>
											<Icon className="size-4" />
											{label}
										</button>
									))}
								</div>
							</fieldset>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="fb-message">Your message</Label>
								<Textarea
									id="fb-message"
									required
									rows={4}
									maxLength={2000}
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									placeholder="The more detail, the better…"
									className="resize-none bg-card"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="fb-email">
									Email{" "}
									<span className="font-normal text-ink-faint">
										— only if you'd like a reply (optional)
									</span>
								</Label>
								<Input
									id="fb-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@school.edu.ng"
									className="bg-card"
								/>
							</div>

							{error && (
								<p className="text-sm font-medium text-destructive">{error}</p>
							)}

							<Button
								type="submit"
								className="w-full rounded-full"
								disabled={busy}
							>
								{busy ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									"Send feedback"
								)}
							</Button>
						</form>
					</>
				)}
			</div>
		</div>
	);
}
