import { createFileRoute } from "@tanstack/react-router";
import { Check, Mail, Package } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { useSessionUser } from "#/features/auth/use-session-user.ts";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_app/customize")({
	ssr: false,
	component: CustomizePage,
});

const ORDER_EMAIL = "nexahubt@gmail.com";

type Product = {
	id: string;
	name: string;
	group: "Wear" | "Souvenirs";
	sizes: boolean;
};

const PRODUCTS: Product[] = [
	{ id: "tee", name: "Sign-out tee", group: "Wear", sizes: true },
	{ id: "hoodie", name: "Heavy hoodie", group: "Wear", sizes: true },
	{ id: "sweatshirt", name: "Crew sweatshirt", group: "Wear", sizes: true },
	{ id: "tote", name: "Tote bag", group: "Wear", sizes: false },
	{ id: "cap", name: "Cap", group: "Wear", sizes: false },
	{ id: "framed", name: "Framed print", group: "Wear", sizes: false },
	{ id: "mug", name: "Mug", group: "Souvenirs", sizes: false },
	{ id: "cup", name: "Travel cup", group: "Souvenirs", sizes: false },
	{ id: "wristband", name: "Wristband", group: "Souvenirs", sizes: false },
	{ id: "keychain", name: "Key chain", group: "Souvenirs", sizes: false },
];

const COLOURS = [
	{ id: "white", label: "Cotton white", swatch: "#fbfaf6" },
	{ id: "green", label: "Naija green", swatch: "#1e9e5a" },
	{ id: "pink", label: "Pink", swatch: "#e84b7a" },
	{ id: "blue", label: "Blue", swatch: "#2f6be6" },
	{ id: "amber", label: "Amber", swatch: "#f2a33c" },
	{ id: "black", label: "Chalk black", swatch: "#1b1b19" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function CustomizePage() {
	const { user } = useSessionUser();

	const [productId, setProductId] = useState("tee");
	const [size, setSize] = useState("M");
	const [colourId, setColourId] = useState("white");
	const [qty, setQty] = useState(1);
	const [personalisation, setPersonalisation] = useState("");
	const [boardRef, setBoardRef] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState(false);

	// Prefill the buyer's name from their account once it loads.
	useEffect(() => {
		if (user?.name) setName((n) => n || user.name);
	}, [user]);

	const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];
	const colour = COLOURS.find((c) => c.id === colourId) ?? COLOURS[0];

	function buildMailto() {
		const lines = [
			"New order from Sign Me Out",
			"",
			`Item: ${product.name}`,
			...(product.sizes ? [`Size: ${size}`] : []),
			`Colour: ${colour.label}`,
			`Quantity: ${qty}`,
			`Personalisation: ${personalisation.trim() || "—"}`,
			`Sign-out board: ${boardRef.trim() || "—"}`,
			"",
			"— Delivery —",
			`Name: ${name.trim()}`,
			`Phone / WhatsApp: ${phone.trim()}`,
			`Address: ${address.trim()}`,
			"",
			`Notes: ${notes.trim() || "—"}`,
		];
		const subject = `Sign Me Out order — ${product.name} (x${qty})`;
		return `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(
			subject,
		)}&body=${encodeURIComponent(lines.join("\n"))}`;
	}

	function placeOrder() {
		if (!name.trim() || !phone.trim() || !address.trim()) {
			setError(
				"Add your name, phone number and delivery address so we can reach you.",
			);
			return;
		}
		setError(null);
		window.location.href = buildMailto();
		setSent(true);
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
				Pick a piece, choose your options, and we'll send it your way. Placing
				an order opens your email to {ORDER_EMAIL} with everything filled in —
				just hit send.
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
								max={500}
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
						<Label htmlFor="boardRef">Which sign-out board? (optional)</Label>
						<Input
							id="boardRef"
							value={boardRef}
							onChange={(e) => setBoardRef(e.target.value)}
							placeholder="Space name or link, e.g. CSC Class of 2026"
							className="h-11 bg-card"
						/>
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
							{boardRef.trim() && (
								<div className="flex justify-between gap-4">
									<dt className="text-ink-faint">Board</dt>
									<dd className="truncate text-right font-medium text-ink">
										{boardRef.trim()}
									</dd>
								</div>
							)}
						</dl>

						{error && (
							<p className="mt-4 text-sm font-medium text-destructive">
								{error}
							</p>
						)}

						{sent ? (
							<div className="mt-5 rounded-2xl bg-marker-green-deep/[0.07] p-4">
								<p className="flex items-center gap-2 font-semibold text-marker-green-deep">
									<Check className="size-4" /> Email ready
								</p>
								<p className="mt-1 text-sm text-ink-soft">
									Your email app opened with the order to {ORDER_EMAIL}. Hit
									send to place it. Didn't open?{" "}
									<a href={buildMailto()} className="text-link font-semibold">
										Reopen it
									</a>
									.
								</p>
							</div>
						) : (
							<Button
								type="button"
								size="lg"
								onClick={placeOrder}
								className="pop mt-5 w-full rounded-full"
							>
								<Mail className="size-4" /> Place order via email
							</Button>
						)}
						<p className="mt-3 text-center text-xs text-ink-faint">
							We'll confirm price and delivery by email before anything is
							charged.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
