import { Download, FileCode, FileImage, FileText, Image } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

type ExportFormat = "png" | "jpg" | "svg" | "pdf";

const FORMATS: { id: ExportFormat; label: string; icon: typeof FileImage }[] = [
	{ id: "png", label: "PNG", icon: Image },
	{ id: "jpg", label: "JPG", icon: FileImage },
	{ id: "svg", label: "SVG", icon: FileCode },
	{ id: "pdf", label: "PDF", icon: FileText },
];

export function ExportPicker({
	onExport,
}: {
	onExport: (format: ExportFormat) => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onDown(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={open}
			>
				<Download className="size-4" />
				<span className="hidden sm:inline">Export</span>
			</Button>
			{open && (
				<div
					role="menu"
					className="paper-card absolute right-0 z-50 mt-2 w-44 rounded-2xl p-2"
				>
					<p className="kicker mb-1 px-2">Export as</p>
					{FORMATS.map((f) => (
						<button
							key={f.id}
							type="button"
							onClick={() => {
								onExport(f.id);
								setOpen(false);
							}}
							className={cn(
								"flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
								"text-ink hover:bg-ink/5",
							)}
						>
							<f.icon className="size-4 shrink-0 text-ink-soft" />
							{f.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
