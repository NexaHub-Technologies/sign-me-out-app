import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Gift, Loader2, Lock } from "lucide-react";
import { type SubmitEvent, useState } from "react";

import {
	EMPTY_GIFT,
	GiftFields,
	type GiftFormValue,
} from "#/components/gift-fields.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { UniversitySelect } from "#/components/university-select.tsx";
import { BOARD_COLORS, boardColorById } from "#/lib/board-colors.ts";
import { normalizeGift } from "#/lib/gift.ts";
import {
	DEFAULT_TEMPLATE,
	SPACE_TEMPLATES,
	templateById,
} from "#/lib/space-templates.ts";
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
	const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE.id);
	const [color, setColor] = useState(DEFAULT_TEMPLATE.boardColor);
	const [note, setNote] = useState(DEFAULT_TEMPLATE.defaultNote);
	const [university, setUniversity] = useState("");
	const [revealAt, setRevealAt] = useState("");
	const [giftOpen, setGiftOpen] = useState(false);
	const [gift, setGift] = useState<GiftFormValue>(EMPTY_GIFT);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const tpl = templateById(templateId);
	// Soft floor for the capsule picker: "now" in local wall-clock (the server
	// re-checks that the reveal is actually in the future).
	const minReveal = new Date(
		Date.now() - new Date().getTimezoneOffset() * 60000,
	)
		.toISOString()
		.slice(0, 16);

	// Picking an occasion seeds the board colour and the note; the title is left
	// to the host (we only swap its placeholder).
	function pickTemplate(id: string) {
		const t = templateById(id);
		setTemplateId(id);
		setColor(t.boardColor);
		setNote(t.defaultNote);
	}

	async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);
		const title = String(form.get("title") ?? "").trim();
		if (!title) {
			setError("A space name is required");
			return;
		}
		// Validate the optional gift up front (before charging) so a malformed
		// account never blocks between payment and space creation.
		let giftInput: GiftFormValue | null;
		try {
			giftInput = giftOpen ? normalizeGift(gift) : null;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Check the gift details");
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
								university: university || undefined,
								gift: giftInput ?? undefined,
								paymentReference: reference,
								revealAt: revealAt || undefined,
							},
						});
						navigate({
							to: "/s/$spaceId",
							params: { spaceId: slug },
							search: { welcome: true },
						});
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
				<fieldset className="flex flex-col gap-3">
					<legend className="mb-1 text-sm font-medium text-ink">
						What's the occasion?
					</legend>
					<div className="flex flex-wrap gap-2.5">
						{SPACE_TEMPLATES.map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => pickTemplate(t.id)}
								aria-pressed={templateId === t.id}
								className={cn(
									"rounded-full border px-4 py-2 text-sm font-medium transition-colors",
									templateId === t.id
										? "border-marker-blue bg-marker-blue-deep/[0.06] text-ink"
										: "border-line bg-card text-ink-soft hover:border-line-strong",
								)}
							>
								<span className="mr-1.5">{t.emoji}</span>
								{t.label}
							</button>
						))}
					</div>
				</fieldset>

				<div className="flex flex-col gap-2">
					<Label htmlFor="title">Space name</Label>
					<Input
						id="title"
						name="title"
						required
						placeholder={tpl.titlePlaceholder}
						className="h-12 bg-card text-base"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="university">
						What university are you signing out from?{" "}
						<span className="text-ink-faint">(optional)</span>
					</Label>
					<UniversitySelect
						id="university"
						value={university}
						onChange={setUniversity}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="note">A note for people who sign (optional)</Label>
					<Textarea
						id="note"
						name="note"
						value={note}
						onChange={(e) => setNote(e.target.value)}
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
										? "border-transparent ring-2 ring-marker-blue ring-offset-2 ring-offset-paper"
										: "border-line hover:scale-110",
								)}
								style={{ backgroundColor: c.bg }}
							/>
						))}
					</div>
					<p className="text-sm text-ink-soft">{boardColorById(color).label}</p>
				</fieldset>

				<div className="rounded-2xl border border-line bg-card/60 p-4">
					<button
						type="button"
						onClick={() => setGiftOpen((v) => !v)}
						aria-expanded={giftOpen}
						className="flex w-full items-start gap-3 text-left"
					>
						<span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-marker-blue/10 text-marker-blue-deep">
							<Gift className="size-5" />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block font-medium text-ink">
								Add a cash gift{" "}
								<span className="text-ink-faint">(optional)</span>
							</span>
							<span className="mt-0.5 block text-sm text-ink-soft">
								Show a bank account on the canvas so friends can send you money.
							</span>
						</span>
						<span className="mt-1 text-sm font-semibold text-marker-blue-deep">
							{giftOpen ? "Remove" : "Add"}
						</span>
					</button>

					{giftOpen && (
						<div className="mt-5 border-t border-line pt-5">
							<GiftFields value={gift} onChange={setGift} />
							<p className="mt-3 text-xs text-ink-faint">
								Anyone who opens your space can see and copy these details.
							</p>
						</div>
					)}
				</div>

				<div className="rounded-2xl border border-line bg-card/60 p-4">
					<div className="flex items-start gap-3">
						<span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-marker-blue/10 text-marker-blue-deep">
							<Lock className="size-5" />
						</span>
						<div className="min-w-0 flex-1">
							<Label htmlFor="revealAt" className="font-medium text-ink">
								Seal as a time capsule{" "}
								<span className="text-ink-faint">(optional)</span>
							</Label>
							<p className="mt-0.5 text-sm text-ink-soft">
								People can still sign, but the board stays hidden behind a
								countdown until the date you pick — then it opens and everyone
								who signed gets an email.
							</p>
							<Input
								id="revealAt"
								name="revealAt"
								type="datetime-local"
								value={revealAt}
								min={minReveal}
								onChange={(e) => setRevealAt(e.target.value)}
								className="mt-3 h-11 bg-card"
							/>
						</div>
					</div>
				</div>

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
