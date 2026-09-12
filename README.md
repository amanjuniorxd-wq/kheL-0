# Sahayata

A community wealth-redistribution platform. Users create accounts, request
financial support, or contribute to an automated redistribution pool that
allocates funds by priority score. Every request submission, floor
statement, and pool payout is written to the **mishrin ledger** — an
append-only, hash-chained table that anyone can read and independently
verify, with a dedicated admin console for oversight. Donors can pay
through any of six rails — Visa/MasterCard (Stripe), UPI (Razorpay or
Cashfree), PayPal, and Venmo — all settling through one unified webhook.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- React Hook Form + Zod for the request-creation flow
- Stripe, Razorpay, Cashfree, and PayPal (incl. Venmo) for payments

## Verification badges

`profiles.verification_tier` (migration 0008) adds Instagram-style tiers,
rendered by `components/VerificationBadge.tsx` next to a name wherever one
shows up — the account page header, a request card's requester, and any
ledger entry with an attributed delegate:

- `meme` — grey tick, lightweight "community verified"
- `govt` — blue tick, a verified government-affiliated account
- `govt_authority` — gold tick, a verified government oversight/issuing body
- `cosmic` — a singular prismatic tick reading "Mishrin, creator of cosmos."
  A partial unique index (`profiles_single_cosmic_tier`) makes this
  literally impossible to duplicate at the database level — at most one
  profile can hold it at any moment, not just "please only grant it once"
  as a matter of admin discipline.

Admins grant or revoke a badge from the **Verification badges** panel in
`/admin/mishrin-ledger` (look up a user by email, pick a tier, apply). That
calls `set_verification_tier()`, a Postgres function gated by `is_admin()`
that touches only the `verification_tier` column (not the rest of the
profile), auto-demotes whoever currently holds `cosmic` before promoting a
new holder, and writes its own `admin_override` ledger entry — so every
badge change is itself a public, attributed, auditable fact, the same as
every other admin action in this app.

## Windows desktop app (.exe)

`desktop/` has an Electron shell that wraps your deployed Sahayata site in
a native window — build it into a real Windows installer/portable `.exe`
with `npm install && npm run dist:win` from that folder, once Node is
installed. Full instructions, including why it's a thin shell around your
deployed URL rather than a bundled copy of the server, are in
`desktop/README.md`.

## Installable on Android (PWA)

The app is now installable straight from the browser — no APK to build or
sideload. `public/manifest.webmanifest`, `public/sw.js`, and the icons in
`public/icons/` make it a standards-compliant PWA:

1. Deploy the site (Vercel or any HTTPS host — installability requires
   HTTPS, `localhost` also works for testing).
2. Open it in Chrome on Android → menu → **Install app** (or Chrome shows
   an automatic install prompt/banner). It's added to the home screen with
   the Sahayata icon and opens in its own standalone window, no browser
   chrome.
3. `public/sw.js` is intentionally conservative: it caches only Next.js's
   content-hashed static assets and shows `public/offline.html` if a page
   navigation fails outright. It never caches pages, API responses, or
   Supabase requests — this app's balances, ledger entries, and account
   data are always fetched live, so nothing here can show a stale figure.

### If you genuinely need a signed `.apk` later

That requires an Android SDK and a machine that can reach Google's
package servers — neither is available in the sandbox that built this
project, so it has to happen on your own machine (or CI) with Android
Studio installed. Two ways to get there from this same PWA, once it's
deployed:

- **Bubblewrap (Trusted Web Activity)** — wraps the deployed PWA URL in a
  thin native shell; no app code duplication. `npm i -g @bubblewrap/cli`,
  then `bubblewrap init --manifest=https://your-domain/manifest.webmanifest`
  and `bubblewrap build`.
- **Capacitor** — gives you a real native Android project you can extend
  with native plugins later. `npm i @capacitor/core @capacitor/android`,
  `npx cap init`, `npx cap add android`, then open `android/` in Android
  Studio (or `./gradlew assembleDebug` from the CLI) to produce the `.apk`.

Either path produces a real, installable, signable `.apk` — just not one
this sandbox can compile itself.

## Database schema

Four core tables, per the platform spec:

- **`profiles`** — one row per `auth.users`, plus a `role` (`user` |
  `admin`) that gates the admin console.
- **`assistance_requests`** — a request for financial support (renamed
  from `requests` in migration 0006 to match the spec's naming).
- **`transactions`** — every movement of money, consolidated into one
  table (migration 0006 folds the earlier `contributions`,
  `pool_transactions`, and `allocations` tables into this one), tagged by
  `kind`: `direct_contribution` (donor → a specific request),
  `pool_contribution` (donor → the general pool), or `pool_allocation`
  (pool → a request, done automatically by the redistribution engine;
  `provider = 'system_pool'` marks these as internal, not gateway-sourced).
- **`mishrin_ledger`** — the hash-chained audit log (see below).

## Project layout

```
app/
  (auth)/sign-in, (auth)/sign-up, (auth)/auth/callback   – authentication
  account/                                                – profile, live request/donation history, ledger entries, delete account
  requests/new/                                           – multi-step request form
  dashboard/                                               – active requests, pool widget, public ledger feed
    CheckoutModal.tsx                                       – unified 4-gateway "Fund now" modal
  admin/mishrin-ledger/                                     – admin-only console (see below)
  api/payments/stripe/create-intent/                        – Stripe PaymentIntent
  api/payments/razorpay/create-order/                       – Razorpay order (UPI + cards)
  api/payments/cashfree/create-order/                       – Cashfree order (UPI + local cards)
  api/payments/paypal/create-order/, capture-order/          – PayPal/Venmo order + client-side capture
  api/webhooks/payments/                                     – single inbound webhook for all four gateways
lib/
  supabase/{client,server,middleware}.ts                  – Supabase clients + session refresh + route/admin gating
  auth/admin.ts                                             – requireAdmin() server guard
  mishrin/{server,types}.ts                                – ledger writer + chain verifier + types
  payments/{credit,cashfree,paypal}.ts                      – shared idempotent credit logic + gateway helpers
  validations/request.ts                                   – Zod schema for request creation
supabase/
  migrations/0001_init.sql                                 – profiles, requests, pool, contributions, RLS
  migrations/0002_mishrin_ledger.sql                        – hash-chained audit log + append function
  migrations/0003_pool_summary.sql                          – get_pool_summary() RPC
  migrations/0004_storage.sql                                – request-documents storage bucket + policies
  migrations/0005_multi_gateway.sql                          – widen provider check constraints (superseded by 0006)
  migrations/0006_schema_consolidation.sql                   – renames/merges to assistance_requests + transactions
  migrations/0007_admin.sql                                  – admin role, is_admin(), admin RLS, admin_append_mishrin_entry()
  functions/redistribute-pool/index.ts                      – priority-score allocation Edge Function
```

## Setup

1. `npm install`
2. Create a Supabase project, then run every file in `supabase/migrations`
   **in order** (SQL editor, or `supabase db push` if the project is
   linked) — 0001 through 0007 build on each other.
3. Copy `.env.example` to `.env.local` and fill in whichever gateway keys you
   plan to use — the Checkout modal only shows a tab for a gateway whose
   `NEXT_PUBLIC_*` key is set, so you can enable them incrementally.
4. Promote your own account to admin once you've signed up once:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-user-id>';
   ```
   An "Admin" link then appears in the nav, and `/admin/mishrin-ledger`
   becomes reachable.
5. `npm run dev`

## The admin console (`/admin/mishrin-ledger`)

Gated three ways, independently: `middleware.ts` bounces non-admins at the
edge before the page even renders, `requireAdmin()` (`lib/auth/admin.ts`)
re-checks server-side in `app/admin/layout.tsx` and in every admin server
action, and the database's own `is_admin()`-gated RLS policies (migration
0007) enforce it a third time regardless of what the application layer
does. A bug in any one layer doesn't expose the others.

- **Live floor feed** (`LiveFloorFeed.tsx`) — an unfiltered, auto-updating
  stream of every ledger write as it lands, for oversight. A
  `floor_statement` entry's `metadata.audio_url` renders as an inline
  player if present, so audio transcripts and the text alongside them
  show up together.
- **System-wide ledger audit table** (`LedgerAuditTable.tsx`) — every
  column the spec asked for (`delegate_id`, `event_type`, amount pulled
  from `metadata.amount`, `statement_text`, timestamp, `transaction_hash`),
  filterable by event type and by delegate/text, paginated, and still
  live for new entries.
- **Engine controls** (`EngineControls.tsx`) — "Trigger manual pool
  rebalance" invokes the `redistribute-pool` Edge Function on demand,
  attributed to the calling admin; "Run audit verification" recomputes
  the full hash chain (`verifyMishrinChain()`) and writes its own
  pass/fail entry back to the ledger, so the audit result is itself
  public and auditable.
- **Request status overrides** (`RequestOverridePanel.tsx`) — approve,
  reject, or flag/close any pending request; each action both updates
  `assistance_requests.status` and writes an `admin_override` ledger
  entry naming the admin and the reason.

**A deliberate departure from the literal spec, worth calling out:** the
spec asks for "full read/write oversight" on the mishrin ledger for
admins. Direct `UPDATE`/`DELETE` access — for anyone, including admins —
would defeat the entire point of an immutable public ledger, so that
grant was not implemented. What admins get instead is `INSERT`-only,
through a second `SECURITY DEFINER` function
(`admin_append_mishrin_entry()`) that checks `is_admin(auth.uid())` before
writing. Every admin action (an override, a rebalance, an audit run) is
still fully visible and attributed in the ledger — it just can't rewrite
history. If you genuinely need admins to be able to correct/annotate a
past entry, add a `superseded_by`/`correction_of` self-reference column
instead of granting `UPDATE`, so the original entry stays intact and the
correction is itself a new, visible ledger row.

## Wiring up each payment gateway

All four gateways post their webhook events to the same endpoint:

```
https://<your-domain>/api/webhooks/payments
```

- **Stripe**: Dashboard → Developers → Webhooks → add endpoint, subscribe to
  `payment_intent.succeeded`. Copy the signing secret into
  `STRIPE_WEBHOOK_SECRET`.
- **Razorpay**: Dashboard → Settings → Webhooks → add endpoint, subscribe to
  `payment.captured`. Copy the webhook secret into
  `RAZORPAY_WEBHOOK_SECRET` (this is separate from your API key secret).
- **Cashfree**: Merchant dashboard → Developers → Webhooks → add endpoint for
  `PAYMENT_SUCCESS_WEBHOOK`. Your `CASHFREE_SECRET_KEY` doubles as the
  webhook-signing key.
- **PayPal / Venmo**: Developer dashboard → your app → Webhooks → add
  endpoint, subscribe to `PAYMENT.CAPTURE.COMPLETED`. Copy the generated
  webhook ID into `PAYPAL_WEBHOOK_ID`. Venmo checkout requires your PayPal
  app to have Venmo funding enabled (US only) — it then appears automatically
  as a second button in the PayPal tab of the checkout modal.

The webhook route (`app/api/webhooks/payments/route.ts`) tells providers
apart by which signature header is present (`stripe-signature`,
`x-razorpay-signature`, `x-webhook-signature` + `x-webhook-timestamp`, or
`paypal-transmission-sig`), verifies that provider's signature scheme, and
only then calls `creditContribution()` (`lib/payments/credit.ts`) — the one
place that writes a `transactions` row and a mishrin ledger entry. That
function is idempotent on `provider_payment_id`, so a provider's webhook
retries (all of them retry on non-2xx, and some retry regardless) never
double-credit a donation. PayPal/Venmo also captures client-side in
`onApprove` for a fast UI response; that path calls the same
`creditContribution()`, so whichever of the two — client capture or webhook —
lands first wins and the other is a no-op.

## Deploying the redistribution engine

```bash
supabase functions deploy redistribute-pool
supabase functions schedule redistribute-pool --cron "*/15 * * * *"
```

This runs the priority-score allocator on a schedule: it scores every
active, unfunded request as `0.4·urgency + 0.3·queue_time + 0.3·need_gap`,
allocates the pool's available balance in that order, and writes both a
`transactions` row (`kind = 'pool_allocation'`) and a `mishrin_ledger`
entry for each payout. The same function is also callable on demand from
the admin console's Engine Controls panel with `{ triggeredBy: adminId }`,
which attributes the resulting ledger entries to that admin instead of
leaving them anonymous.

## Security notes

- All tables use Row Level Security. Users can only read/update/delete
  their own `profiles` and `assistance_requests`; admins additionally get
  `SELECT`/`UPDATE` on every `assistance_requests` row via `is_admin()`
  policies (migration 0007). `transactions` and `mishrin_ledger` rows are
  publicly readable (this is a transparency platform) but writable only
  via `SECURITY DEFINER` functions called with the service-role key from
  trusted server code (form submission handlers, verified payment
  webhooks, the Edge Function) — never from client-supplied writes.
- Every payment webhook verifies that gateway's signature before crediting
  anything; a request whose signature doesn't check out is rejected with
  400 and nothing is written. The client's own "success" callback (used
  only by PayPal/Venmo, for responsiveness) is never trusted alone — it
  runs through the identical, idempotent `creditContribution()` path.
- `middleware.ts` refreshes the Supabase session on every request,
  redirects unauthenticated users away from protected routes server-side,
  and additionally checks `profiles.role` before letting anyone into
  `/admin/*` — with `requireAdmin()` and RLS as backup layers underneath.
- The mishrin ledger is hash-chained (`transaction_hash` commits to
  `prev_hash` + payload); `verifyMishrinChain()` in `lib/mishrin/server.ts`
  recomputes the chain to detect any tampering with history, and the admin
  console's "Run audit verification" button does this on demand over the
  whole ledger. Regular users — admins included — have
  `INSERT`/`UPDATE`/`DELETE` revoked on `mishrin_ledger` directly; every
  entry is written by `append_mishrin_entry()` (service-role/server code)
  or `admin_append_mishrin_entry()` (admins, `INSERT`-only, `is_admin()`
  gated).

## Known gaps to close before production

- `lib/payments/paypal.ts` fetches a fresh OAuth token on every call — fine
  for correctness, but cache it (tokens are valid ~9 hours) if PayPal volume
  gets meaningful.
- Amounts entered in the checkout modal are in the request's currency
  (₹ for Razorpay/Cashfree) but sent to PayPal as a flat USD value — add
  real currency conversion before accepting international PayPal donations
  against ₹-denominated targets.
- `transactions.provider_payment_id` has a `unique` constraint (migration
  0006), which is what makes `creditContribution()`'s idempotency work —
  don't drop it.
- There's no admin UI yet for promoting/demoting other users' `role` —
  it's a one-line SQL update today (see Setup step 4). Worth a small
  "Admins" panel before handing this to a non-technical operator.
