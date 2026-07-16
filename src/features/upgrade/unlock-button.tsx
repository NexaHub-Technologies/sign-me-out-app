import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { formatNaira } from "#/lib/plan.ts";
import { completeSpaceUnlock, initSpaceUnlock } from "#/server/payments.ts";

/**
 * The "unlock this board" CTA: starts the Paystack transaction server-side
 * (which fixes the price — ₦1,200 for the account's first unlock, ₦1,000
 * after), resumes it in the inline popup, then completes the unlock and hands
 * control back via `onDone` (callers refresh their loader data).
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

	async function unlock() {
		setBusy(true);
		try {
			const { accessCode, reference } = await initSpaceUnlock({
				data: { slug },
			});
			// Imported lazily so SSR never touches it.
			const { default: PaystackPop } = await import("@paystack/inline-js");
			const popup = new PaystackPop();
			popup.resumeTransaction(accessCode, {
				onSuccess: async () => {
					try {
						await completeSpaceUnlock({ data: { slug, reference } });
						await onDone();
					} catch (err) {
						onError(
							err instanceof Error
								? err.message
								: "Payment went through but the unlock didn't apply — reload and try again.",
						);
					} finally {
						setBusy(false);
					}
				},
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
				Unlock{amountKobo ? ` · ${formatNaira(amountKobo)}` : ""}
			</span>
		</Button>
	);
}
