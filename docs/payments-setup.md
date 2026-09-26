# DropInn Paddle payments

The sandbox integration is implemented for a one-time $10 USD supporter pack: Travelling teacup and Lamplighter’s hat, each with two extra palettes. It grants account-wide cosmetics, never power or story access. Google/email sign-in is required; anonymous guests cannot buy.

## Configuration

Netlify project: `dropp-in`, public domain `playdropinn.com`. Supabase project: `jfwjgjwltqhloqhsqkxp`.

Server variables (no secret values belong in source control):

| Variable | Purpose |
| --- | --- |
| `PADDLE_ENVIRONMENT` | `sandbox` or `production`; grants are isolated by environment |
| `PADDLE_API_KEY` | Transactions read/write, prices/products/adjustments read, and discounts read for the launch offer |
| `PADDLE_CLIENT_TOKEN` | Matching public Paddle.js token; returned by the account API |
| `PADDLE_WEBHOOK_SECRET` | Verify exact raw callback body |
| `PADDLE_SUPPORTER_PRICE_ID` | Fixed server-controlled one-time USD 10 price |
| `PADDLE_LAUNCH_DISCOUNT_ID` | Optional active Paddle 50% discount restricted to the supporter price |
| `PADDLE_LAUNCH_STARTS_AT`, `PADDLE_LAUNCH_ENDS_AT` | RFC 3339 UTC launch window, at most seven days; the discount's expiry must match |
| `DROPINN_PAYMENTS_ENABLED` | `1` allows new purchases; `0` preserves status checks and callbacks |

The saved sandbox price is `pri_01m3e39y9dvqfcqtr7tx4bfwd1`; product `pro_01m3e385gz54pxza5ehgb7wngk`. The current API key expires December 25, 2026. Rotate it in Paddle and update Netlify before then.

Sandbox rehearsal coupon `FIRSTTALE50` is discount `dsc_01m3f1rhhyf0f4em2c3b6dx41r`, 50% off only the supporter price, expiring October 3, 2026 at 14:00 UTC. It is not wired into Netlify: the existing sandbox API key lacks `discount.read`. Keep the sandbox launch variables unset until a matching key is available; this avoids showing $5 when the server cannot verify the coupon.

Paddle default payment link: `https://playdropinn.com/checkout`.
Webhook: `https://playdropinn.com/.netlify/functions/paddle-webhook`.
Destination: `ntfset_01m3e5ddrx4fj8djjf6dq91xtn`, Platform events: `transaction.completed`, `transaction.updated`, `transaction.canceled`, `adjustment.created`, `adjustment.updated`.

Sandbox shop appears at `/checkout` or `/?payments=sandbox`, with an explicit no-real-money label. The ordinary homepage keeps the sandbox shop hidden. The checkout page resumes the authenticated account’s server-owned purchase; arbitrary `_ptxn` parameters never grant or open another account’s order.

## Payment flow

1. The authenticated command service validates the configured $10 price and, during the first-week window, Paddle's exact 50% price-restricted discount. It owns the purchase UUID and reserves one active bundle per account in PostgreSQL. Concurrent/repeated requests reuse the order.
2. It records the discount ID before creating one Paddle transaction with fixed price/quantity and server metadata. Paddle.js opens that transaction; card details stay with Paddle. The shop shows $5 during the offer, $10 afterward, and the original price for a resumed checkout.
3. The server fetches the current transaction and adjustments, validates bundle, base amount, exact recorded discount, currency, quantity, environment and metadata, and atomically updates the order and webhook receipt. Browser checkout-success messages are only a prompt to check the server.
4. Collection and hero-save APIs derive paid ownership from completed orders. Confirmed refunds and chargebacks remove paid access; earned Thread and keepsakes remain intact. A chargeback reversal can restore access. Refunds are terminal for that order.
5. “Check purchase / restore items,” page focus, pending polling and a five-minute scheduled reconciliation recover missed callbacks. A timed-out create is searched for rather than retried as a new charge. Uncertain orders stay pending for manual review if they cannot be found.

`payment_orders` and `payment_events` use RLS and service-only access. Apply `supabase/migrations/202609260001_payments.sql` before dependent code, then `202609260002_payment_launch_discount.sql`. Both are additive and repeatable. These migrations were applied to the hosted project on September 26, 2026 after confirming schema prerequisites and the existing September 25 daily physical backup.

## Verification and operations

Run `rtk vitest run`, `npm run build`, and `node scripts/test-database.mjs <fresh-dropinn-qa-container>`. The SQL harness checks concurrent checkout, idempotent receipts, refund ordering, environment isolation and client access denial, alongside existing account/reward checks. Native hat review uses `.agents/skills/dropinn-art/scripts/review-heroes.mjs`.

If a buyer reports missing items, use their purchase reference to inspect the order and corresponding Paddle transaction in the same environment. Retry/check current provider state; never grant access from an email or browser callback alone. Retry failed Paddle notifications or use the restore button. If an uncertain create has no provider transaction, investigate before canceling its local reservation. Do not issue a second charge as a recovery shortcut.

To stop new sales, set `DROPINN_PAYMENTS_ENABLED=0` and redeploy; leave webhook/API configuration active to fulfill existing payments. Code rollback can use the previous Netlify deploy; keep the additive ledger tables for reconciliation and records.

## Live launch remains separate

The hosted site currently uses simulated sandbox payments. Production needs Paddle seller/product/domain approval, confirmed business and tax settings, public Terms/Privacy/Refund pages, separate production product/price and credentials, a production webhook, and a real-payment verification. Create a standard Paddle percentage discount for the live price with amount `50`, `restrict_to` containing only that price ID, and `expires_at` exactly seven days after launch; a shareable code such as `FIRSTTALE50` may be enabled, while DropInn applies the discount automatically. Set the three launch variables together immediately before production activation. Never relabel sandbox purchases as production ownership. An environment change requires a browser reload.

Supabase Auth's Site URL and redirect allowlist must include `https://playdropinn.com/`; a localhost fallback sends Google sign-in away from the checkout. The site URL was still `http://localhost:3000` and only `https://dropp-in.netlify.app/` was allowlisted on September 26, 2026.
