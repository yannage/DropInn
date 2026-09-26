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

The hosted site currently uses simulated sandbox payments. Production needs Paddle seller/product/domain approval, confirmed business and tax settings, separate production product/price and credentials, a production webhook, and a real-payment verification. Public Terms/Privacy/Refund pages and `themainyak@gmail.com` support contact are implemented; review them against the seller's actual practices before activation. Paddle's customer handbook also asks sellers to list a buyer support phone number, which has not been provided. Create a standard Paddle percentage discount for the live price with amount `50`, `restrict_to` containing only that price ID, and `expires_at` exactly seven days after launch; a shareable code such as `FIRSTTALE50` may be enabled, while DropInn applies the discount automatically. Set the three launch variables together immediately before production activation. Never relabel sandbox purchases as production ownership. An environment change requires a browser reload.

### Live migration audit — September 26, 2026

The live account exists under the same Paddle login. Its catalog was empty before this migration. The matching active standard-digital-goods product and one-time, location-taxed USD 10 price were created without changing sandbox entities:

| Entity | Sandbox | Live |
| --- | --- | --- |
| Supporter product | `pro_01m3e385gz54pxza5ehgb7wngk` | `pro_01m3fdv5yrsh3mejkzgx60srv0` |
| One-time USD 10 price | `pri_01m3e39y9dvqfcqtr7tx4bfwd1` | `pri_01m3fdx21cgff6sj1htb1pb830` |
| 50% first-week discount | `dsc_01m3f1rhhyf0f4em2c3b6dx41r` (sandbox rehearsal) | Not created yet; choose the actual launch week after verification |

`playdropinn.com` was submitted in **Checkout > Website approval** and is pending. The live account has no saved API key yet; its least-privilege creation form is prepared for the owner to finish. A client-side token named `DropInn live checkout` was created and saved in Netlify as production-only `PADDLE_LIVE_CLIENT_TOKEN`. The live price ID is saved there as production-only `PADDLE_LIVE_SUPPORTER_PRICE_ID`. Its default payment link is empty. PayPal, Apple Pay, and Bancontact are selected under **Checkout > Checkout settings > Payment Methods**. Google Pay was selected by owner request, but Paddle refused to save the setting while the default payment link is empty; enable and save it once the approved domain and default link are in place. Payout settings have no bank/payment details completed. No live transaction has been created.

The code already selects `https://api.paddle.com` for `PADDLE_ENVIRONMENT=production` and calls `Paddle.Environment.set('sandbox')` only when sandbox is explicitly selected. Product and price IDs are server configuration, not hard-coded in the frontend. The original `PADDLE_*` credentials and price remain sandbox. Set `PADDLE_LIVE_SUPPORTER_PRICE_ID=pri_01m3fdx21cgff6sj1htb1pb830` with the matching `PADDLE_LIVE_CLIENT_TOKEN`, `PADDLE_LIVE_API_KEY`, and `PADDLE_LIVE_WEBHOOK_SECRET`. The environment selector chooses that live set only when `PADDLE_ENVIRONMENT=production`; the live webhook endpoint always uses it. Keep `DROPINN_PAYMENTS_ENABLED=0` while verifying. Do not change the public Netlify site from sandbox until the domain and seller are approved and the live test phase is authorized.

The new live notification destination `ntfset_01m3fejg98514evct97gaynwbc` is active at `https://playdropinn.com/.netlify/functions/paddle-live-webhook`, subscribing to `transaction.completed`, `transaction.updated`, `transaction.canceled`, `adjustment.created`, and `adjustment.updated`. Copy its signing secret from Paddle into production-only Netlify `PADDLE_LIVE_WEBHOOK_SECRET` without putting it in chat or source control. The dedicated handler reads `PADDLE_LIVE_API_KEY` and `PADDLE_LIVE_WEBHOOK_SECRET` so the public sandbox checkout and its notification destination stay intact during preparation. Deploy the handler and set these variables before generating a live notification. The original sandbox webhook endpoint always uses the original `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET`, even after the environment selector switches to production. Do not change the sandbox destination itself.

The pasted instruction to fetch `https://api.paddle.com/ips` for webhook allowlisting is inaccurate: [Paddle's IP-address endpoint](https://developer.paddle.com/api-reference/ip-addresses/) describes **API egress** IPs, while [its webhook delivery guide](https://developer.paddle.com/webhooks/about/respond-to-webhooks/) lists webhook sender IPs separately. Do not reject production webhooks using the API egress list. The handler already verifies Paddle's signed raw body. Add network allowlisting only at a boundary that exposes the actual peer address, using Paddle's webhook-specific list and a maintenance process for changes.

Paddle Retain's `pwCustomer` is not wired: this purchase is one-time, the app has no subscription lifecycle or stored Paddle customer ID, and passing an internal account ID or email would be incorrect. Add it only with a future Retain integration that stores verified `ctm_...` customer IDs.

Supabase Auth's Site URL and redirect allowlist must include `https://playdropinn.com/`; a localhost fallback sends Google sign-in away from the checkout. The owner reported updating both on September 26, 2026; independently verify the dashboard setting and a Google sign-in round trip before production activation.
