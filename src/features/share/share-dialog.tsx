import { Check, Copy, Loader2, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { boardColorById } from "#/lib/board-colors.ts";

/**
 * Share sheet for a sign-out space: the link, a scannable QR that points at the
 * live `/s/<slug>` URL, and a print-ready poster so a host can put the board up
 * in the room. The QR encodes `window.location.origin` (matches wherever the
 * app is actually served — dev or prod), consistent with the header copy-link.
 *
 * The poster is a `.print-poster` node: hidden on screen, but when the browser
 * prints it fills the page while everything else is hidden (see styles.css).
 */
export function ShareDialog({
	slug,
	title,
	boardColor,
	onClose,
}: {
	slug: string;
	title: string;
	boardColor: string;
	onClose: () => void;
}) {
	const [qr, setQr] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const url =
		typeof window !== "undefined" ? `${window.location.origin}/s/${slug}` : "";
	const board = boardColorById(boardColor);

	// Close on Escape.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	// Generate the QR client-side (lazy import keeps qrcode out of the SSR path).
	useEffect(() => {
		if (!url) return;
		let alive = true;
		import("qrcode")
			.then(({ default: QRCode }) =>
				QRCode.toDataURL(url, { width: 1024, margin: 2 }),
			)
			.then((dataUrl) => {
				if (alive) setQr(dataUrl);
			})
			.catch(() => {
				/* QR is a nicety — the link + copy still work without it */
			});
		return () => {
			alive = false;
		};
	}, [url]);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			/* clipboard unavailable */
		}
	}

	return (
		<>
			<div className="fixed inset-0 z-50 grid place-items-center p-4">
				<button
					type="button"
					aria-label="Close"
					className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-sm"
					onClick={onClose}
				/>
				<div
					className="paper-card relative w-full max-w-sm rounded-2xl p-6"
					role="dialog"
					aria-modal="true"
					aria-labelledby="share-title"
				>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
					>
						<X className="size-4" />
					</button>

					<p className="kicker">Share to sign</p>
					<h2
						id="share-title"
						className="font-display mt-1 line-clamp-2 text-xl font-extrabold text-ink"
					>
						{title}
					</h2>

					<div className="mt-5 grid place-items-center rounded-2xl border border-line bg-card p-4">
						{qr ? (
							<img
								src={qr}
								alt={`QR code linking to ${title}`}
								className="size-48"
							/>
						) : (
							<div className="grid size-48 place-items-center text-ink-faint">
								<Loader2 className="size-6 animate-spin" />
							</div>
						)}
					</div>

					<p className="mt-4 truncate rounded-lg border border-line bg-paper/60 px-3 py-2 text-center text-sm text-ink-soft">
						{url.replace(/^https?:\/\//, "")}
					</p>

					<div className="mt-4 flex gap-2.5">
						<Button
							variant="outline"
							className="flex-1 rounded-full"
							onClick={copyLink}
						>
							{copied ? (
								<Check className="size-4" />
							) : (
								<Copy className="size-4" />
							)}
							{copied ? "Copied" : "Copy link"}
						</Button>
						<Button
							className="flex-1 rounded-full"
							onClick={() => window.print()}
							disabled={!qr}
						>
							<Printer className="size-4" /> Print poster
						</Button>
					</div>
				</div>
			</div>

			{/* Print-only poster (hidden on screen via .print-poster). */}
			<div
				className="print-poster flex-col items-center justify-center gap-10 p-16 text-center"
				style={{
					backgroundColor: board.bg,
					backgroundImage: `radial-gradient(${board.dot} 1.5px, transparent 2px)`,
					backgroundSize: "32px 32px",
					color: board.dot.includes("255,255,255") ? "#ffffff" : "#1b1b19",
				}}
			>
				<div>
					<p className="text-2xl font-semibold opacity-70">Sign Me Out</p>
					<h1 className="font-display mt-4 text-6xl font-extrabold">{title}</h1>
				</div>
				{qr && (
					<img
						src={qr}
						alt=""
						className="size-96 rounded-2xl bg-white p-4 shadow-lg"
					/>
				)}
				<div>
					<p className="text-4xl font-bold">Scan to sign ✍️</p>
					<p className="mt-3 text-xl opacity-70">
						{url.replace(/^https?:\/\//, "")}
					</p>
				</div>
			</div>
		</>
	);
}
