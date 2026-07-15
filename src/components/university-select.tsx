import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { NIGERIAN_UNIVERSITIES } from "#/lib/universities.ts";
import { cn } from "#/lib/utils.ts";

/**
 * Searchable dropdown for the ~215-entry university list. A native <select>
 * (the banks pattern) is unusable at this size, so this is a small combobox:
 * a button trigger opens a panel with a filter input and a keyboard-navigable
 * list. Self-contained on purpose — no popover/portal library; the panel is
 * absolutely positioned inside the field, which is fine in a stacked form.
 */
export function UniversitySelect({
	id,
	value,
	onChange,
}: {
	/** Id for the trigger button, so a <Label htmlFor> can focus it. */
	id?: string;
	value: string;
	onChange: (next: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const listboxId = useId();

	// Every query token must appear somewhere in the name, so "lagos state",
	// "unilag" and "futa akure" all land on the right row.
	const results = useMemo(() => {
		const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		if (tokens.length === 0) return NIGERIAN_UNIVERSITIES;
		return NIGERIAN_UNIVERSITIES.filter((uni) => {
			const name = uni.toLowerCase();
			return tokens.every((t) => name.includes(t));
		});
	}, [query]);

	function openPanel() {
		setQuery("");
		// Start on the current pick so reopening shows it in view.
		const idx = NIGERIAN_UNIVERSITIES.indexOf(value);
		setActive(idx >= 0 ? idx : 0);
		setOpen(true);
	}

	function select(uni: string) {
		onChange(uni);
		setOpen(false);
	}

	useEffect(() => {
		if (open) searchRef.current?.focus();
	}, [open]);

	// Any press outside the field closes the panel.
	useEffect(() => {
		if (!open) return;
		function onPointerDown(e: PointerEvent) {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll tracks the active row
	useEffect(() => {
		if (!open) return;
		listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
	}, [open, active, results]);

	function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((a) => Math.min(a + 1, results.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const pick = results[active];
			if (pick) select(pick);
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				id={id}
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => (open ? setOpen(false) : openPanel())}
				onKeyDown={(e) => {
					if (!open && e.key === "ArrowDown") {
						e.preventDefault();
						openPanel();
					}
				}}
				className={cn(
					"flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none transition-[color,box-shadow]",
					"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
					value ? "pr-14" : "text-muted-foreground",
				)}
			>
				<span className="truncate">{value || "Choose your university"}</span>
				<ChevronDown className="size-4 shrink-0 text-ink-faint" />
			</button>
			{value && (
				<button
					type="button"
					aria-label="Clear university"
					onClick={() => {
						onChange("");
						setOpen(false);
					}}
					className="absolute top-1/2 right-9 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-faint hover:bg-line/60 hover:text-ink"
				>
					<X className="size-4" />
				</button>
			)}

			{open && (
				<div className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
					<div className="flex items-center gap-2 border-b border-line px-3">
						<Search className="size-4 shrink-0 text-ink-faint" />
						<input
							ref={searchRef}
							role="combobox"
							aria-expanded="true"
							aria-controls={listboxId}
							aria-activedescendant={
								results.length > 0 ? `${listboxId}-${active}` : undefined
							}
							aria-label="Search universities"
							placeholder="Search by name or acronym…"
							autoComplete="off"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								setActive(0);
							}}
							onKeyDown={onSearchKeyDown}
							className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
						/>
					</div>
					<div
						ref={listRef}
						id={listboxId}
						role="listbox"
						aria-label="Universities"
						className="max-h-64 overflow-y-auto p-1"
					>
						{results.map((uni, i) => (
							<button
								key={uni}
								type="button"
								id={`${listboxId}-${i}`}
								role="option"
								aria-selected={uni === value}
								tabIndex={-1}
								onClick={() => select(uni)}
								onMouseMove={() => setActive(i)}
								className={cn(
									"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
									i === active
										? "bg-marker-blue-deep/[0.06] text-ink"
										: "text-ink-soft",
								)}
							>
								<Check
									className={cn(
										"size-4 shrink-0 text-marker-blue-deep",
										uni === value ? "opacity-100" : "opacity-0",
									)}
								/>
								<span className="min-w-0 flex-1">{uni}</span>
							</button>
						))}
						{results.length === 0 && (
							<p className="px-3 py-6 text-center text-sm text-ink-faint">
								No university matches “{query}”
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
