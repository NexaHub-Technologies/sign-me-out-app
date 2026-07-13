import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

/** Human "2d 4h 13m" (or "3m 12s" near the end) until the target time. */
function formatCountdown(msLeft: number): string {
	if (msLeft <= 0) return "now";
	const s = Math.floor(msLeft / 1000);
	const days = Math.floor(s / 86400);
	const hrs = Math.floor((s % 86400) / 3600);
	const mins = Math.floor((s % 3600) / 60);
	const secs = s % 60;
	if (days > 0) return `${days}d ${hrs}h ${mins}m`;
	if (hrs > 0) return `${hrs}h ${mins}m`;
	return `${mins}m ${secs}s`;
}

/**
 * Top banner shown on a sealed time-capsule board. For signers it explains they
 * can still sign now and the board opens on the reveal date; for the host (who
 * already sees the board) it's a quieter "you're previewing" note. Ticks every
 * second so the countdown stays live. When the timer hits zero it reloads so the
 * now-open board (and its reveal email) comes through.
 */
export function SealedBanner({
	revealAt,
	hostPreview = false,
}: {
	revealAt: string;
	hostPreview?: boolean;
}) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	const target = new Date(revealAt).getTime();
	const left = target - now;

	// Timer elapsed — pull the freshly-opened board.
	useEffect(() => {
		if (left <= 0 && typeof window !== "undefined") window.location.reload();
	}, [left]);

	const opensOn = new Date(revealAt).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});

	return (
		<div className="pointer-events-none absolute left-1/2 top-20 z-30 w-[min(92vw,30rem)] -translate-x-1/2">
			<div className="paper-card pointer-events-auto rounded-2xl px-4 py-3 text-center">
				<p className="flex items-center justify-center gap-2 font-display font-bold text-ink">
					<Lock className="size-4 text-marker-blue-deep" />
					{hostPreview ? "Sealed — you're previewing" : "This board is sealed"}
				</p>
				<p className="mt-1 text-sm text-ink-soft">
					Opens in{" "}
					<span className="font-semibold text-ink">
						{formatCountdown(left)}
					</span>{" "}
					· {opensOn}
				</p>
				{!hostPreview && (
					<p className="mt-1 text-xs text-ink-faint">
						You can still sign now — your mark appears when the board opens.
					</p>
				)}
			</div>
		</div>
	);
}
