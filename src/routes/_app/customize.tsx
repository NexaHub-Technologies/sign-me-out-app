import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Check, ChevronDown, Loader2, Lock, Package } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { useSessionUser } from "#/features/auth/use-session-user.ts";
import {
	COLOURS,
	formatPrice,
	MAX_QTY,
	PRODUCTS,
	SIZES,
} from "#/lib/order-options.ts";
import { cn } from "#/lib/utils.ts";
import { confirmMerchOrder } from "#/server/orders.ts";
import { initMerchPayment, verifyMerchPayment } from "#/server/payments.ts";
import { fetchSessionUser } from "#/server/session.ts";
import { listMySpaces } from "#/server/spaces.ts";

export const Route = createFileRoute("/_app/customize")({
	ssr: false,
	beforeLoad: async () => {
		const user = await fetchSessionUser();
		if (!user) {
			throw redirect({ to: "/login", search: { next: "/customize" } });
		}
	},
	loader: async () => listMySpaces(),
	component: CustomizePage,
});

function CustomizePage() {
	const { user } = useSessionUser();
	const spaces = Route.useLoaderData();

	const [productId, setProductId] = useState("tee");
	const [size, setSize] = useState("M");
	const [colourId, setColourId] = useState("white");
	const [qty, setQty] = useState(1);
	const [personalisation, setPersonalisation] = useState("");
	const [boardSlug, setBoardSlug] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [placed, setPlaced] = useState<{
		reference: string;
		confirmationSent: boolean;
	} | null>(null);

	// Prefill the buyer's name and email from their account once it loads.
	useEffect(() => {
		if (user?.name) setName((n) => n || user.name);
		const userEmail = user?.email;
		if (userEmail) setEmail((e) => e || userEmail);
	}, [user]);

	const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];
	const colour = COLOURS.find((c) => c.id === colourId) ?? COLOURS[0];
	const board = spaces.find((s) => s.slug === boardSlug);
	const totalKobo = product.priceKobo * qty;

	async function submitOrder() {
		if (!board) {
			setError("Pick the sign-out board we're printing.");
			return;
		}
		if (!name.trim() || !phone.trim() || !address.trim()) {
			setError(
				"Add your name, phone number and delivery address so we can reach you.",
			);
			return;
		}
		if (!email.trim()) {
			setError("Add your email so we can confirm your order.");
			return;
		}
		setError(null);
		setSubmitting(true);

		try {
			// 1. Start the Paystack transaction server-side (amount calculated from product price × qty).
			const { accessCode, reference } = await initMerchPayment({
				data: {
					productId,
					qty,
					size: product.sizes ? size : "",
					colourId,
					personalisation,
					boardRef: `${board.title} (${window.location.origin}/s/${board.slug})`,
					name: name.trim(),
					email: email.trim(),
					phone: phone.trim(),
					address: address.trim(),
					notes: notes.trim(),
				},
			});

			// 2. Open the Paystack popup. Imported lazily so SSR never touches it.
			const { default: PaystackPop } = await import("@paystack/inline-js");
			const popup = new PaystackPop();
			popup.resumeTransaction(accessCode, {
				// 3. Payment confirmed — verify with Paystack, then send emails.
				onSuccess: async () => {
					try {
						// Verify the payment with Paystack and mark order as paid.
						await verifyMerchPayment({ data: { reference } });
						// Now confirm the order: read from DB and send emails.
						await confirmMerchOrder({ data: { reference } });
						setPlaced({ reference, confirmationSent: true });
					} catch (err) {
						setError(
							err instanceof Error
								? err.message
								: "Payment went through but we couldn't confirm your order — please contact support.",
						);
						setSubmitting(false);
					}
				},
				onCancel: () => {
					setError("Payment cancelled — your order wasn't placed.");
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
		<div className="page-wrap py-12">
			<p className="kicker inline-flex items-center gap-2">
				<Package className="size-3.5" /> Customise &amp; order
			</p>
			<h1 className="font-display mt-2 text-3xl font-extrabold text-ink sm:text-[2.6rem]">
				Print your sign-out on{" "}
				<span
					className="hl"
					style={{ "--hl": "var(--marker-amber)" } as CSSProperties}
				>
					something you'll keep.
				</span>
			</h1>
			<p className="mt-3 max-w-2xl text-lg text-ink-soft">
				Pick a piece, choose your options, and we'll send it your way. Pay
				securely via Paystack and we'll email you a confirmation.
			</p>

			<div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
				{/* options */}
				<div className="flex flex-col gap-8">
					<fieldset>
						<legend className="text-sm font-semibold text-ink">
							What are we printing?
						</legend>
						{(["Wear", "Souvenirs"] as const).map((group) => (
							<div key={group} className="mt-3">
								<p className="kicker mb-2">{group}</p>
								<div className="flex flex-wrap gap-2.5">
									{PRODUCTS.filter((p) => p.group === group).map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => setProductId(p.id)}
											aria-pressed={productId === p.id}
											className={cn(
												"rounded-full border px-4 py-2 text-sm font-medium transition-colors",
												productId === p.id
													? "border-marker-green bg-marker-green-deep/[0.06] text-ink"
													: "border-line bg-card text-ink-soft hover:border-line-strong",
											)}
										>
											{p.name}
											<span className="ml-1.5 text-xs text-ink-faint">
												{formatPrice(p.priceKobo)}
											</span>
										</button>
									))}
								</div>
							</div>
						))}
					</fieldset>

					{product.sizes && (
						<fieldset>
							<legend className="mb-3 text-sm font-semibold text-ink">
								Size
							</legend>
							<div className="flex flex-wrap gap-2.5">
								{SIZES.map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => setSize(s)}
										aria-pressed={size === s}
										className={cn(
											"grid size-11 place-items-center rounded-xl border text-sm font-semibold transition-colors",
											size === s
												? "border-marker-green bg-marker-green-deep/[0.06] text-ink"
												: "border-line bg-card text-ink-soft hover:border-line-strong",
										)}
									>
										{s}
									</button>
								))}
							</div>
						</fieldset>
					)}

					<fieldset>
						<legend className="mb-3 text-sm font-semibold text-ink">
							Colour
						</legend>
						<div className="flex flex-wrap gap-3">
							{COLOURS.map((c) => (
								<button
									key={c.id}
									type="button"
									onClick={() => setColourId(c.id)}
									aria-pressed={colourId === c.id}
									className={cn(
										"flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
										colourId === c.id
											? "border-marker-green bg-marker-green-deep/[0.06] text-ink"
											: "border-line bg-card text-ink-soft hover:border-line-strong",
									)}
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

					<div className="grid gap-6 sm:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="qty">Quantity</Label>
							<Input
								id="qty"
								type="number"
								min={1}
								max={MAX_QTY}
								value={qty}
								onChange={(e) =>
									setQty(Math.max(1, Number(e.target.value) || 1))
								}
								className="h-11 bg-card"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="personalisation">
								Personalisation (optional)
							</Label>
							<Input
								id="personalisation"
								value={personalisation}
								onChange={(e) => setPersonalisation(e.target.value)}
								placeholder="Name, class set, or a short line"
								className="h-11 bg-card"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="boardRef">Which sign-out board?</Label>
						{spaces.length > 0 ? (
							<div className="relative">
								<select
									id="boardRef"
									value={boardSlug}
									onChange={(e) => setBoardSlug(e.target.value)}
									className={cn(
										"h-11 w-full appearance-none rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none transition-[color,box-shadow]",
										"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
										!boardSlug && "text-muted-foreground",
									)}
								>
									<option value="" disabled>
										Choose the board we're printing…
									</option>
									{spaces.map((s) => (
										<option key={s.id} value={s.slug}>
											{s.title}
										</option>
									))}
								</select>
								<ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-faint" />
							</div>
						) : (
							<p className="rounded-md border border-dashed border-line-strong bg-card px-3 py-2.5 text-sm text-ink-soft">
								You don't have a sign-out board yet — it's what we print.{" "}
								<Link to="/create" className="text-link font-semibold">
									Create one first
								</Link>
								.
							</p>
						)}
					</div>

					<div className="border-t border-line pt-7">
						<h2 className="font-display text-lg font-bold text-ink">
							Where should we send it?
						</h2>
						<div className="mt-4 grid gap-6 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="name">Full name</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Ada Obi"
									autoComplete="name"
									className="h-11 bg-card"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="phone">Phone / WhatsApp</Label>
								<Input
									id="phone"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="0801 234 5678"
									autoComplete="tel"
									className="h-11 bg-card"
								/>
							</div>
						</div>
						<div className="mt-6 flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="ada@example.com"
								autoComplete="email"
								className="h-11 bg-card"
							/>
							<p className="text-xs text-ink-faint">
								We'll send your order confirmation here.
							</p>
						</div>
						<div className="mt-6 flex flex-col gap-2">
							<Label htmlFor="address">Delivery address</Label>
							<Textarea
								id="address"
								value={address}
								onChange={(e) => setAddress(e.target.value)}
								rows={2}
								placeholder="Street, city, state"
								className="resize-none bg-card"
							/>
						</div>
						<div className="mt-6 flex flex-col gap-2">
							<Label htmlFor="notes">Notes for us (optional)</Label>
							<Textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={2}
								placeholder="Print layout, deadline, anything else"
								className="resize-none bg-card"
							/>
						</div>
					</div>
				</div>

				{/* summary */}
				<div className="lg:sticky lg:top-24 lg:self-start">
					<div className="paper-card rounded-3xl p-6">
						<p className="kicker">Your order</p>
						<div className="mt-4 flex items-center gap-3">
							<span
								className="size-12 shrink-0 rounded-2xl border border-line"
								style={{ backgroundColor: colour.swatch }}
							/>
							<div>
								<p className="font-display text-lg font-bold text-ink">
									{product.name}
								</p>
								<p className="text-sm text-ink-soft">
									{colour.label}
									{product.sizes ? ` · Size ${size}` : ""} · Qty {qty}
								</p>
							</div>
						</div>

						<dl className="mt-5 flex flex-col gap-2 text-sm">
							{personalisation.trim() && (
								<div className="flex justify-between gap-4">
									<dt className="text-ink-faint">Personalisation</dt>
									<dd className="text-right font-medium text-ink">
										{personalisation.trim()}
									</dd>
								</div>
							)}
							{board && (
								<div className="flex justify-between gap-4">
									<dt className="text-ink-faint">Board</dt>
									<dd className="truncate text-right font-medium text-ink">
										{board.title}
									</dd>
								</div>
							)}
							<div className="mt-2 flex justify-between gap-4 border-t border-line pt-3">
								<dt className="font-semibold text-ink">Total</dt>
								<dd className="text-right text-lg font-bold text-ink">
									{formatPrice(totalKobo)}
								</dd>
							</div>
						</dl>

						{error && (
							<p className="mt-4 text-sm font-medium text-destructive">
								{error}
							</p>
						)}

						{placed ? (
							<div className="mt-5 rounded-2xl bg-marker-green-deep/[0.07] p-4">
								<p className="flex items-center gap-2 font-semibold text-marker-green-deep">
									<Check className="size-4" /> Order confirmed
								</p>
								<p className="mt-1 text-sm text-ink-soft">
									Your order <strong>{placed.reference}</strong> has been paid
									and confirmed. We'll start processing it right away.{" "}
									{placed.confirmationSent
										? `We've emailed a confirmation to ${email.trim()}.`
										: "We couldn't email your confirmation, but the order is confirmed — we'll reach you on the details you gave."}
								</p>
							</div>
						) : (
							<Button
								type="button"
								size="lg"
								onClick={submitOrder}
								disabled={submitting}
								className="pop mt-5 w-full rounded-full"
							>
								{submitting ? (
									<>
										<Loader2 className="size-4 animate-spin" /> Processing…
									</>
								) : (
									<>
										Pay {formatPrice(totalKobo)}
										<Lock className="size-3.5" />
									</>
								)}
							</Button>
						)}
						<p className="mt-3 text-center text-xs text-ink-faint">
							Secure payment by Paystack. Your order is confirmed instantly.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
