# DropInn Paddle payments

The sandbox integration is implemented for a one-time $10 USD supporter pack: Travelling teacup and Lamplighter’s hat, each with two extra palettes. It grants account-wide cosmetics, never power or story access. Google/email sign-in is required; anonymous guests cannot buy.

## Configuration

Netlify project: `dropp-in`, public domain `playdropinn.com`. Supabase project: `jfwjgjwltqhloqhsqkxp`.

Server variables (no secret values belong in source control):

| Variable | Purpose |
| --- | --- |
| `PADDLE_ENVIRONMENT` | `sandbox` or `production`; grants are isolated by environment |
| `PADDLE_API_KEY` | Transactions read/write, prices/products/adjustments read |
| `PADDLE_CLIENT_TOKEN` | Matching public Paddle.js token; returned by the account API |
| `PADDLE_WEBHOOK_SECRET` | Verify exact raw callback body |
| `PADDLE_SUPPORTER_PRICE_ID` | Fixed server-controlled one-time USD 10 price |
| `DROPINN_PAYMENTS_ENABLED` | `1` allows new purchases; `0` preserves status checks and callbacks |

The saved sandbox price is `pri_01m3e39y9dvqfcqtr7tx4bfwd1`; product `pro_01m3e385gz54pxza5ehgb7wngk`. The current API key expires December 25, 2026. Rotate it in Paddle and update Netlify before then.

Paddle default payment link: `https://playdropinn.com/checkout`.
Webhook: `https://playdropinn.com/.netlify/functions/paddle-webhook`.
Destination: `ntfset_01m3e5ddrx4fj8djjf6dq91xtn`, Platform events: `transaction.completed`, `transaction.updated`, `transaction.canceled`, `adjustment.created`, `adjustment.updated`.

Sandbox shop appears at `/checkout` or `/?payments=sandbox`, with an explicit no-real-money label. The ordinary homepage keeps the sandbox shop hidden. The checkout page resumes the authenticated account’s server-owned purchase; arbitrary `_ptxn` parameters never grant or open another account’s order.

## Payment flow

1. The authenticated command service validates the configured price, owns the purchase UUID, and reserves one active bundle per account in PostgreSQL. Concurrent/repeated requests reuse the order.
2. It creates one Paddle transaction with fixed price/quantity and server metadata. Paddle.js opens that transaction; card details stay with Paddle.
3. The server fetches the current transaction and adjustments, validates bundle, amount, currency, quantity, environment and metadata, and atomically updates the order and webhook receipt. Browser checkout-success messages are only a prompt to check the server.
4. Collection and hero-save APIs derive paid ownership from completed orders. Confirmed refunds and chargebacks remove paid access; earned Thread and keepsakes remain intact. A chargeback reversal can restore access. Refunds are terminal for that order.
5. “Check purchase / restore items,” page focus, pending polling and a five-minute scheduled reconciliation recover missed callbacks. A timed-out create is searched for rather than retried as a new charge. Uncertain orders stay pending for manual review if they cannot be found.

`payment_orders` and `payment_events` use RLS and service-only access. Apply `supabase/migrations/202609260001_payments.sql` before dependent code. It is additive and repeatable. This migration was applied to the hosted project on September 26, 2026 after confirming schema prerequisites and the existing September 25 daily physical backup.

## Verification and operations

Run `rtk vitest run`, `npm run build`, and `node scripts/test-database.mjs <fresh-dropinn-qa-container>`. The SQL harness checks concurrent checkout, idempotent receipts, refund ordering, environment isolation and client access denial, alongside existing account/reward checks. Native hat review uses `.agents/skills/dropinn-art/scripts/review-heroes.mjs`.

If a buyer reports missing items, use their purchase reference to inspect the order and corresponding Paddle transaction in the same environment. Retry/check current provider state; never grant access from an email or browser callback alone. Retry failed Paddle notifications or use the restore button. If an uncertain create has no provider transaction, investigate before canceling its local reservation. Do not issue a second charge as a recovery shortcut.

To stop new sales, set `DROPINN_PAYMENTS_ENABLED=0` and redeploy; leave webhook/API configuration active to fulfill existing payments. Code rollback can use the previous Netlify deploy; keep the additive ledger tables for reconciliation and records.

## Live launch remains separate

This setup uses simulated sandbox payments. Production needs Paddle seller/product/domain approval, confirmed business and tax settings, public Terms/Privacy/Refund pages, separate production product/price and credentials, a production webhook, and an explicitly authorized real-payment verification. Never relabel sandbox purchases as production ownership. An environment change requires a browser reload.
