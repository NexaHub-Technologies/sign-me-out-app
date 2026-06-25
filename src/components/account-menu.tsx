import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LayoutDashboard, LogOut, Package } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "#/components/ui/avatar.tsx";
import { signOut } from "#/features/auth/actions.ts";
import type { SessionUser } from "#/features/auth/use-session-user.ts";

/** Avatar + dropdown (Your spaces, Wear, Log out) shown when a user is signed in. */
export function AccountMenu({ user }: { user: SessionUser }) {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (!open) return;
		function onPointer(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const initial = user.name?.trim()?.[0]?.toUpperCase() ?? "S";

	async function onLogout() {
		setBusy(true);
		await signOut();
		setOpen(false);
		setBusy(false);
		navigate({ to: "/" });
	}

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label="Account menu"
				className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-ink/5"
			>
				<Avatar className="size-9">
					{user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
					<AvatarFallback className="bg-marker-green-deep font-display text-sm font-bold text-white">
						{initial}
					</AvatarFallback>
				</Avatar>
				<ChevronDown
					className={`size-4 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{open && (
				<div
					role="menu"
					className="paper-card absolute right-0 z-50 mt-2 w-56 rounded-2xl p-1.5"
				>
					<div className="px-3 py-2">
						<p className="text-xs text-ink-faint">Signed in as</p>
						<p className="font-display truncate font-bold text-ink">
							{user.name}
						</p>
					</div>
					<div className="my-1 h-px bg-line" />
					<Link
						to="/dashboard"
						role="menuitem"
						onClick={() => setOpen(false)}
						className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft no-underline transition-colors hover:bg-ink/5 hover:text-ink"
					>
						<LayoutDashboard className="size-4" /> Your spaces
					</Link>
					<Link
						to="/customize"
						role="menuitem"
						onClick={() => setOpen(false)}
						className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft no-underline transition-colors hover:bg-ink/5 hover:text-ink"
					>
						<Package className="size-4" /> Customise &amp; order
					</Link>
					<div className="my-1 h-px bg-line" />
					<button
						type="button"
						role="menuitem"
						onClick={onLogout}
						disabled={busy}
						className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-marker-pink/10 hover:text-marker-pink disabled:opacity-50"
					>
						<LogOut className="size-4" /> Log out
					</button>
				</div>
			)}
		</div>
	);
}
