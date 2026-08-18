import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { formatNaira } from "#/lib/plan.ts";
import { completeSpaceUnlock, initSpaceUnlock } from "#/server/payments.ts";

/**
 * The "unlock this board" CTA: starts the Paystack transaction server-side
 * (which fixes the flat ₦1,000 price), resumes it in the inline popup, then
 * completes the unlock and hands control back via `onDone` (callers refresh
 * their loader data).
 */
export function UnlockButton({
	slug,
	amountKobo,
	onDone,
	onError,
	className,
}: {
	slug: string;
	/** Quoted price for the label; the server re-quotes when checkout starts. */
	amountKobo: number | null;
	onDone: () => void | Promise<void>;
	onError: (message: string) => void;
	className?: string;
}) {
	const [busy, setBusy] = useState(false);
	// Held after a successful charge whose completion failed. `completeSpaceUnlock`
	// is idempotent, so the fix is to retry it with the same reference — never to
	// start a second transaction, which would charge the host twice.
	const [pendingRef, setPendingRef] = useState<string | null>(null);

	async function finish(reference: string) {
		try {
			await completeSpaceUnlock({ data: { slug, reference } });
			setPendingRef(null);
			await onDone();
		} catch (err) {
			setPendingRef(reference);
			onError(
				err instanceof Error
					? err.message
					: "Payment went through but the unlock didn't apply — tap to finish.",
			);
		} finally {
			setBusy(false);
		}
	}

	async function unlock() {
		setBusy(true);
		// A charge already landed — finish that one instead of paying again.
		if (pendingRef) return finish(pendingRef);
		try {
			const { accessCode, reference } = await initSpaceUnlock({
				data: { slug },
			});
			// Imported lazily so SSR never touches it.
			const { default: PaystackPop } = await import("@paystack/inline-js");
			const popup = new PaystackPop();
			popup.resumeTransaction(accessCode, {
				onSuccess: () => finish(reference),
				onCancel: () => setBusy(false),
				onError: (err: { message?: string }) => {
					onError(err?.message || "Payment failed. Please try again.");
					setBusy(false);
				},
			});
		} catch (err) {
			onError(err instanceof Error ? err.message : "Could not start payment");
			setBusy(false);
		}
	}

	return (
		<Button size="sm" className={className} onClick={unlock} disabled={busy}>
			{busy ? (
				<Loader2 className="size-4 animate-spin" />
			) : (
				<Sparkles className="size-4" />
			)}
			<span>
				{pendingRef
					? "Finish unlocking"
					: `Unlock${amountKobo ? ` · ${formatNaira(amountKobo)}` : ""}`}
			</span>
		</Button>
	);
}
