# Pricing & Marketing Strategy

_Last updated: July 2026, alongside the freemium launch. The tunable numbers
live in `src/lib/plan.ts`; this document records what they are and why._

## The model

**Free to start. ₦1,000 unlocks a board — and once you've unlocked one, open
as many boards as you like.**

| | Free board | Unlocked board (₦1,000, one-time) |
|---|---|---|
| Guest marks (signatures, notes, photos) | 5 total, 1 per guest | Unlimited |
| Host's own marks | 2 total | Unlimited |
| Voice notes | — | ✓ |
| Exports (PNG/JPG/SVG/PDF) | — | ✓ |
| Open additional boards | — (first board only) | ✓ (account-wide, permanent) |

Rules:

- Every signed-up account opens its **first board free** — no card required.
  All boards start free-tier.
- A flat **₦1,000** unlock (Paystack, host pays) lifts every limit on that
  board. Any completed unlock also permanently stamps the account
  (`profiles.spaces_unlocked_at`), enabling unlimited board creation; each
  new board starts free-tier and unlocks for the same ₦1,000.
- Signers never pay. No subscriptions.
- **Grandfathering:** all boards created under the old pay-to-create model
  were backfilled as unlocked, and their owners as multi-board-enabled
  (migration `drizzle/0010`). Nobody lost anything they had paid for.

## Why freemium replaced pay-to-create

The old model charged ₦1,000 *before* the user saw the product. But the
product's value is a board covered in signatures — the demo is the filled
board itself, which a paywall prevented from ever existing. Freemium lets the
demo build itself, then asks for money at the moment of maximum motivation.

## Why the paywall sits where it does

- **The 5-guest cap is the conversion trigger.** It trips exactly when the
  host is most invested: friends are actively signing, the event is imminent,
  and the upgrade is urgent rather than speculative. Free tiers convert best
  when the limit is hit *during* peak engagement, not before it.
- **Each guest gets exactly one mark.** A free board reads as real signatures
  — one per person who received the link — rather than one friend filling
  the pool alone. Enforced per author, not just in aggregate.
- **The host's own marks don't count toward the guest cap** — a welcome note
  shouldn't eat the taste guests get. But the host has their own small
  2-mark cap, so passing a signed-in device around to farm extra "guest"
  signatures can't dodge the real guest limit (worst case, a free board
  holds 7 marks: 5 guests × 1 each, plus 2 from the host).
- **Voice notes and exports are unlock-only.** Exports especially: the export
  is the keepsake, wanted at the end — a second natural upgrade moment for
  boards that never hit the mark cap.
- **The one-free-board rule** prevents splitting signatures across many free
  boards, and makes "unlock any board" the single path to multi-board use.

## Why a flat ₦1,000 (and not the ₦1,200 first-unlock that was considered)

A ₦1,200 first unlock (₦1,000 after) was considered: since most customers
graduate once and buy one unlock, the +₦200 would quietly fund the free tier.
Rejected, for five reasons:

1. **The surcharge was rented against conversion.** At ₦1,200 you must keep
   ≥5/6 of the buyers you'd have at ₦1,000 just to break even — risking the
   funnel to collect roughly 13 US cents per customer.
2. **It broke the one-sentence pitch.** Word-of-mouth is the distribution;
   pricing a student can't repeat correctly at a party is a distribution tax.
3. **It charged the premium to the wrong person.** The newcomer — least
   convinced, most price-sensitive — paid more than the returning customer,
   for a bundled right ("open more boards") they don't yet value.
4. **₦1,000 was the established anchor.** Keeping it reads as "same price,
   but now try before you buy" — pure generosity. Raising it alongside the
   free tier reads as bait.
5. **Simplicity in the payment path.** One price deleted the two-price quote
   logic and its verification edge cases; fewer states in a payment flow
   means fewer lost payments.

## When to raise the price

Raise when the data says demand is inelastic — not before. Watch three
numbers (all derivable from `payments`, `sign_spaces`, `marks`):

1. **Capped-board conversion** — of free boards that hit the 5-guest cap,
   the share that unlock within ~7 days. This is the true price test.
   - Under ~25%: price (or product) is a blocker — don't raise.
   - 25–50%: healthy — hold.
   - **Above ~50–60%: underpriced — raise.**
2. **Checkout completion** — of Paystack inits (Unlock clicks), the share
   that complete payment. Above ~85% means price isn't causing hesitation at
   the moment of truth.
3. **Growth trend** — raise into strength. A bump during flat growth reads
   as squeezing; during word-of-mouth growth it costs little.

Timing guardrails:

- Observe **one full graduation season** at ₦1,000 first — that's where the
  demand curve lives.
- Want **100+ capped free boards** before trusting any conversion number.
- Never raise mid-season; it punishes the cohort actively spreading the app.

How to raise, when warranted:

- Move to a clean number (**₦1,500**). At +50%, revenue breaks even 
  even if a third of conversions are lost.
- Keep it flat and universal — the one-sentence pitch holds at any level.
- Mechanically: `UNLOCK_PRICE_KOBO` in `src/lib/plan.ts` plus a copy sweep
  (landing pricing section, create page). The price is fixed server-side at
  checkout init, so there are no stale quotes to grandfather.
- If cautious: two-week test in a shoulder period; the number that must go
  up is revenue per capped board.

## Revenue levers to try before touching the base price

- **Add-ons on unlocked boards** — the time-capsule and cash-gift features
  point toward a premium board tier (extended reveal emails, printed board
  via the existing merch pipeline).
- **Bulk / departmental deals** — a class rep buys 10 unlocks at a discount:
  more total revenue, and the circulating price *feels* lower.
- **Merch cross-sell** (already live) — the board is the personalisation
  source for tees; the "Wear it" button on every board is the funnel.

## Where the rules are enforced

| Rule | Location |
|---|---|
| Prices & limits (single source of truth) | `src/lib/plan.ts` |
| One-free-board gate | `createSpace` — `src/server/spaces.ts` |
| Mark caps + voice gate | `addMark` — `src/server/marks.ts` (`assertMarkAllowed`) |
| Payment init / verify / apply | `src/server/payments-core.ts` |
| Export gate (client-only renders) | space page — `src/routes/s.$spaceId.tsx` |
| Grandfathering backfill | `drizzle/0010_secret_layla_miller.sql` |
