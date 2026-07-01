import { Check, Copy, Gift, Loader2, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";

import {
	EMPTY_GIFT,
	GiftFields,
	type GiftFormValue,
} from "#/components/gift-fields.tsx";
import { Button } from "#/components/ui/button.tsx";
import { type GiftInput, hasGift, normalizeGift } from "#/lib/gift.ts";
import { cn } from "#/lib/utils.ts";
import { setSpaceGift } from "#/server/spaces.ts";

type GiftValue = {
	bankName: string;
	accountNumber: string;
	accountName: string;
};

function toGift(input: GiftInput): GiftValue | null {
	return hasGift(input)
		? {
				bankName: input.bankName as string,
				accountNumber: input.accountNumber as string,
				accountName: input.accountName as string,
			}
		: null;
}

/**
 * The pinned "Send a cash gift" card overlaid on the sign space. Anyone can copy
 * the account to send money; the host can add, edit, or remove it in place. Kept
 * out of the Konva canvas so it stays put while signers pan and zoom.
 */
export function GiftCard({
	slug,
	gift: initialGift,
	isHost,
}: {
	slug: string;
	gift: GiftInput;
	isHost: boolean;
}) {
	const [gift, setGift] = useState<GiftValue | null>(() => toGift(initialGift));
	// Start collapsed on phones so the card doesn't cover the "Signing as…" chip;
	// expanded on wider screens where there's room beside it.
	const [open, setOpen] = useState(
		() => typeof window === "undefined" || window.innerWidth >= 640,
	);
	const [editing, setEditing] = useState(false);

	// No gift and not the host → nothing to show.
	if (!gift && !isHost) return null;

	return (
		<div className="absolute right-3 top-3 z-20 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col items-end">
			{gift ? (
				open ? (
					<GiftPanel
						gift={gift}
						isHost={isHost}
						onCollapse={() => setOpen(false)}
						onEdit={() => setEditing(true)}
					/>
				) : (
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="inline-flex items-center gap-2 rounded-full border border-marker-green/30 bg-surface-strong px-3.5 py-2 text-sm font-semibold text-marker-green-deep shadow-md backdrop-blur-md hover:bg-card"
					>
						<Gift className="size-4" /> Send a gift
					</button>
				)
			) : (
				<button
					type="button"
					onClick={() => setEditing(true)}
					className="inline-flex items-center gap-2 rounded-full border border-dashed border-line bg-surface-strong px-3.5 py-2 text-sm font-medium text-ink-soft shadow-sm backdrop-blur-md hover:text-ink"
				>
					<Plus className="size-4" /> Add a cash gift
				</button>
			)}

			{editing && (
				<GiftEditDialog
					slug={slug}
					gift={gift}
					onClose={() => setEditing(false)}
					onSaved={(next) => {
						setGift(next);
						setEditing(false);
						if (next) setOpen(true);
					}}
				/>
			)}
		</div>
	);
}

/** The expanded gift card body with copy-to-clipboard on the account number. */
function GiftPanel({
	gift,
	isHost,
	onCollapse,
	onEdit,
}: {
	gift: GiftValue;
	isHost: boolean;
	onCollapse: () => void;
	onEdit: () => void;
}) {
	const [copied, setCopied] = useState(false);

	async function copyNumber() {
		try {
			await navigator.clipboard.writeText(gift.accountNumber);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			/* clipboard unavailable */
		}
	}

	return (
		<div className="paper-card w-full rounded-2xl p-4">
			<div className="flex items-center justify-between gap-2">
				<span className="inline-flex items-center gap-1.5 font-display text-sm font-extrabold text-ink">
					<Gift className="size-4 text-marker-green-deep" /> Send a cash gift
				</span>
				<div className="flex items-center gap-0.5">
					{isHost && (
						<button
							type="button"
							onClick={onEdit}
							aria-label="Edit gift"
							title="Edit gift"
							className="grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-ink/5 hover:text-ink"
						>
							<Pencil className="size-4" />
						</button>
					)}
					<button
						type="button"
						onClick={onCollapse}
						aria-label="Hide gift card"
						title="Hide"
						className="grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-ink/5 hover:text-ink"
					>
						<X className="size-4" />
					</button>
				</div>
			</div>

			<button
				type="button"
				onClick={copyNumber}
				className="group mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition-colors hover:border-marker-green/40"
			>
				<span className="min-w-0">
					<span className="block font-display text-xl font-bold tracking-wide tabular-nums text-ink">
						{gift.accountNumber}
					</span>
					<span className="mt-0.5 block truncate text-xs text-ink-soft">
						{gift.bankName}
					</span>
				</span>
				<span
					className={cn(
						"inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
						copied
							? "bg-marker-green/15 text-marker-green-deep"
							: "bg-ink/5 text-ink-soft group-hover:bg-marker-green/10 group-hover:text-marker-green-deep",
					)}
				>
					{copied ? (
						<>
							<Check className="size-3.5" /> Copied
						</>
					) : (
						<>
							<Copy className="size-3.5" /> Copy
						</>
					)}
				</span>
			</button>

			<p className="scrawl mt-2 pl-1 text-lg text-marker-green-deep">
				{gift.accountName}
			</p>
		</div>
	);
}

/** Host-only add/edit/remove dialog for the cash gift. */
function GiftEditDialog({
	slug,
	gift,
	onClose,
	onSaved,
}: {
	slug: string;
	gift: GiftValue | null;
	onClose: () => void;
	onSaved: (next: GiftValue | null) => void;
}) {
	const [value, setValue] = useState<GiftFormValue>(() =>
		gift ? { ...gift } : EMPTY_GIFT,
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function save(clear: boolean) {
		setError(null);
		let normalized: GiftValue | null;
		try {
			normalized = clear ? null : normalizeGift(value);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Check the details");
			return;
		}
		setBusy(true);
		try {
			await setSpaceGift({
				data: { slug, gift: normalized ?? EMPTY_GIFT },
			});
			onSaved(normalized);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save the gift");
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
			<div className="paper-card relative z-10 w-full max-w-sm rounded-2xl p-6">
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="absolute right-4 top-4 text-ink-faint hover:text-ink"
				>
					<X className="size-5" />
				</button>

				<h2 className="font-display text-2xl font-extrabold text-ink">
					{gift ? "Edit cash gift" : "Add a cash gift"}
				</h2>
				<p className="mt-1 text-sm text-ink-soft">
					Show a bank account on the canvas for friends to send you money.
				</p>

				<div className="mt-5">
					<GiftFields value={value} onChange={setValue} idPrefix="edit-gift" />
				</div>

				{error && (
					<p className="mt-3 text-sm font-medium text-destructive">{error}</p>
				)}

				<div className="mt-6 flex items-center gap-3">
					<Button
						type="button"
						className="flex-1 rounded-full"
						disabled={busy}
						onClick={() => save(false)}
					>
						{busy ? <Loader2 className="size-4 animate-spin" /> : "Save gift"}
					</Button>
					{gift && (
						<Button
							type="button"
							variant="outline"
							className="rounded-full text-destructive"
							disabled={busy}
							onClick={() => save(true)}
						>
							Remove
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
