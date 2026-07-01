import { useState } from "react";

import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { NIGERIAN_BANKS } from "#/lib/banks.ts";
import { cn } from "#/lib/utils.ts";

export type GiftFormValue = {
	bankName: string;
	accountNumber: string;
	accountName: string;
};

export const EMPTY_GIFT: GiftFormValue = {
	bankName: "",
	accountNumber: "",
	accountName: "",
};

const OTHER = "Other bank";

/**
 * The three cash-gift inputs (bank picker + account number + account name),
 * shared by the create form and the host's edit dialog. Controlled so both
 * callers can validate/submit the value. Choosing "Other bank" reveals a free
 * text field for fintechs or banks not in the curated list.
 */
export function GiftFields({
	value,
	onChange,
	idPrefix = "gift",
}: {
	value: GiftFormValue;
	onChange: (next: GiftFormValue) => void;
	idPrefix?: string;
}) {
	// Which option the <select> shows. "Other bank" when the stored name isn't
	// one of the curated banks (or the host is typing a custom one).
	const [bankChoice, setBankChoice] = useState(() =>
		value.bankName && !NIGERIAN_BANKS.includes(value.bankName)
			? OTHER
			: value.bankName,
	);
	const isOther = bankChoice === OTHER;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor={`${idPrefix}-bank`}>Bank</Label>
				<select
					id={`${idPrefix}-bank`}
					value={bankChoice}
					onChange={(e) => {
						const choice = e.target.value;
						setBankChoice(choice);
						// "Other bank" clears the name so the host types their own; any
						// real bank becomes the stored name directly.
						onChange({
							...value,
							bankName: choice === OTHER ? "" : choice,
						});
					}}
					className={cn(
						"h-12 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none transition-[color,box-shadow]",
						"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
						!bankChoice && "text-muted-foreground",
					)}
				>
					<option value="" disabled>
						Choose a bank
					</option>
					{NIGERIAN_BANKS.map((bank) => (
						<option key={bank} value={bank}>
							{bank}
						</option>
					))}
				</select>
				{isOther && (
					<Input
						aria-label="Bank name"
						placeholder="Type your bank's name"
						value={value.bankName}
						onChange={(e) => onChange({ ...value, bankName: e.target.value })}
						className="h-12 bg-card text-base"
						maxLength={60}
					/>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${idPrefix}-number`}>Account number</Label>
				<Input
					id={`${idPrefix}-number`}
					inputMode="numeric"
					autoComplete="off"
					placeholder="10-digit account number"
					value={value.accountNumber}
					onChange={(e) =>
						onChange({
							...value,
							// Keep only digits, cap at NUBAN length.
							accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
						})
					}
					className="h-12 bg-card text-base tracking-wide tabular-nums"
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${idPrefix}-name`}>Account name</Label>
				<Input
					id={`${idPrefix}-name`}
					autoComplete="off"
					placeholder="Name on the account"
					value={value.accountName}
					onChange={(e) => onChange({ ...value, accountName: e.target.value })}
					className="h-12 bg-card text-base"
					maxLength={60}
				/>
			</div>
		</div>
	);
}
