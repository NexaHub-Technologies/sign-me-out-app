/**
 * Find Paystack charges that never made it into the database.
 *
 * Payment rows are written only after a charge is confirmed, by one of two
 * paths: the buyer's browser calling back, or Paystack's webhook. If both fail
 * — the tab closed *and* the webhook could not be delivered — the money exists
 * only in the Paystack dashboard and nothing in the app knows about it. This
 * script is the reconciliation pass that finds those.
 *
 *   npm run reconcile                      # last 7 days
 *   npm run reconcile -- --since 2026-08-01 --until 2026-08-18
 *   npm run reconcile -- --replay smo_merch_xK9...
 *
 * Deliberately standalone: it imports nothing from src/. The server modules
 * read `import.meta.env`, which only exists under Vite, so importing them from
 * plain node would crash at module load. Talking to Postgres and Paystack
 * directly keeps this runnable anywhere the env vars are.
 *
 * `--replay` re-delivers a signed `charge.success` webhook to the app rather
 * than writing rows itself. That reuses the exact production path
 * (`applyPaystackReference`), which re-verifies the reference against Paystack
 * before acting — so a replay cannot invent a payment, and is idempotent.
 */

import { createHmac } from "node:crypto";
import pg from "pg";

const PAYSTACK = "https://api.paystack.co";
/** Only our own references; the account may carry unrelated traffic. */
const REF_RE = /^smo_(unlock|merch)_/;

type Txn = {
	reference: string;
	amount: number;
	paid_at: string | null;
	customer?: { email?: string };
	metadata?: { purpose?: string } | string | null;
};

function env(name: string): string {
	const value = process.env[name];
	if (!value) {
		console.error(`${name} is not set — add it to .env.local`);
		process.exit(1);
	}
	return value;
}

function naira(kobo: number): string {
	return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

/** Paystack sometimes returns metadata as a JSON string rather than an object. */
function purposeOf(txn: Txn): string {
	const meta = txn.metadata;
	if (!meta) return "—";
	if (typeof meta === "string") {
		try {
			return (JSON.parse(meta) as { purpose?: string }).purpose ?? "—";
		} catch {
			return "—";
		}
	}
	return meta.purpose ?? "—";
}

async function fetchSuccessful(since: string, until: string): Promise<Txn[]> {
	const key = env("PAYSTACK_SECRET_KEY");
	const out: Txn[] = [];
	for (let page = 1; ; page++) {
		const url = `${PAYSTACK}/transaction?status=success&perPage=100&page=${page}&from=${since}&to=${until}`;
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${key}` },
		});
		const body = (await res.json()) as {
			status: boolean;
			message?: string;
			data?: Txn[];
			meta?: { pageCount?: number };
		};
		if (!res.ok || !body.status || !body.data) {
			throw new Error(body.message || `Paystack list failed (${res.status})`);
		}
		out.push(...body.data);
		if (page >= (body.meta?.pageCount ?? 1)) break;
	}
	return out.filter((t) => REF_RE.test(t.reference));
}

/** References already recorded, across both payment tables. */
async function recordedReferences(refs: string[]): Promise<Set<string>> {
	const client = new pg.Client({ connectionString: env("DATABASE_URL") });
	await client.connect();
	try {
		const { rows } = await client.query<{ reference: string }>(
			`select reference from payments      where reference = any($1::text[])
			 union
			 select reference from merch_orders  where reference = any($1::text[])`,
			[refs],
		);
		return new Set(rows.map((r) => r.reference));
	} finally {
		await client.end();
	}
}

/** Re-deliver a signed charge.success webhook for one reference. */
async function replay(reference: string, target: string): Promise<void> {
	const body = JSON.stringify({ event: "charge.success", data: { reference } });
	const signature = createHmac("sha512", env("PAYSTACK_SECRET_KEY"))
		.update(body)
		.digest("hex");
	const res = await fetch(`${target.replace(/\/$/, "")}/v1/webhooks/paystack`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-paystack-signature": signature,
		},
		body,
	});
	const text = await res.text();
	if (!res.ok) {
		console.error(`Replay failed (${res.status}): ${text}`);
		process.exit(1);
	}
	console.log(`Replayed ${reference} → ${text}`);
}

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? undefined : process.argv[i + 1];
}

function isoDay(d: Date): string {
	return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
	const target =
		arg("target") ?? process.env.RECONCILE_TARGET ?? "http://localhost:3000";

	const toReplay = arg("replay");
	if (toReplay) return replay(toReplay, target);

	const until = arg("until") ?? isoDay(new Date());
	const since =
		arg("since") ?? isoDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

	console.log(`Paystack successful charges ${since} → ${until}`);
	const txns = await fetchSuccessful(since, until);
	if (txns.length === 0) {
		console.log("No smo_ charges in that window.");
		return;
	}

	const recorded = await recordedReferences(txns.map((t) => t.reference));
	const missing = txns.filter((t) => !recorded.has(t.reference));

	console.log(`${txns.length} charge(s), ${recorded.size} recorded.\n`);
	if (missing.length === 0) {
		console.log("✓ Everything is recorded.");
		return;
	}

	console.log(`${missing.length} UNRECORDED charge(s):\n`);
	for (const t of missing) {
		console.log(
			`  ${t.reference}  ${naira(t.amount).padStart(10)}  ${
				t.paid_at?.slice(0, 10) ?? "—"
			}  ${purposeOf(t).padEnd(12)}  ${t.customer?.email ?? "—"}`,
		);
	}
	console.log(
		`\nRecord one with:\n  npm run reconcile -- --replay <reference>${
			target === "http://localhost:3000"
				? "   (add --target https://… for prod)"
				: ""
		}`,
	);
	process.exitCode = 1; // so CI/cron can notice
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
