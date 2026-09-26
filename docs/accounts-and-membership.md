# Accounts now; memberships after the game earns repeat visits

Implementation: 2026-09-21. This release adds recoverable accounts and server-owned character saves. Payments, new recurring content, and live AI spending are deferred. Local verification is not a hosted rollout.

## Player promise and motivation

Drop in without registering. Save a hero for free when it becomes yours. Return to familiar characters and recognize what your party changed.

| Motivation | Design support | Evidence still needed |
| --- | --- | --- |
| Understanding / competence | Explicit browser, guest, cloud, pending and failed save states | Can someone explain where their hero is saved? |
| Autonomy | Optional Google or email code; instant guest play | Does saving interrupt a short visit? |
| Expression | Persistent calling, face, color and earned hats | Do players become attached to a particular hero? |
| Fellowship | Shared free stories; preserved attributed visit history | Do friends return together without purchase barriers? |
| Trust | No lost heroes on account recovery; no client-written rewards | Cross-browser recovery and concurrent reward checks |

## Account contract

Supabase Auth remains the login authority. `player_ownership` maps immutable historical player IDs to authenticated account IDs. `characters.user_id`, room snapshots, memberships, event actor names, and reward receipts keep their original identities. A verified account can own several historical player identities after recovery. Its selected character is stored in `player_accounts`.

The command service adds `account`, `hero-save`, `hero-create`, `hero-select`, `claim-prepare`, and `claim-redeem`. Account responses include available heroes, selected character, player IDs, connected providers, and the server capability policy. Authentication determines the account; caller-supplied owner IDs are ignored. Room actions resolve an owned historical player. Account-scoped locking excludes two identities belonging to one account from occupying the same table.

New accounts receive one free hero. Existing and recovered heroes remain available and selectable between visits. Additional creation is rejected by the database policy. This grandfathering is deliberately generous during the pilot; a future subscription must not retroactively erase those heroes.

Character writes run through the server and identity-only SQL functions. Starting stats come from presets, owned cosmetics from saved inventory, and rewards exclusively from the room transaction. Legacy builder wrappers use the same boundary. The account migration removes direct authenticated character writes; stale clients must reload after deployment.

For new-account registration, Google/email is linked to the existing guest UUID. Signing into an existing account uses a random, 15-minute recovery proof prepared under the guest session. Only its hash is stored in the database. A verified destination redeems it once; retry by the same destination is idempotent. The transfer preserves source IDs and blocks old guest access. Active table membership blocks recovery until departure or stale-presence expiry. Departure with a pending result is safe: subsequent rewards still target the original character.

The browser keeps a temporary source session in session storage during recovery so a failed/expired flow can return to the guest and restart. It is cleared after successful recovery or return, never sent as a gameplay payload or logged. Permanent-account merging is not supported. Browser-only designs can be downloaded/imported, but their XP and unlocks are not trusted as cloud rewards.

## Deployment prerequisites and sequence

1. Back up the existing database and verify earlier migrations. Apply `202609210001_accounts.sql` and deploy the matching server/client together during a brief maintenance window. The migration changes write permissions; do not leave the old client as the supported release. Keep both provider flags off until the checks below pass. Rollback must preserve ownership mappings and historical IDs, not restore the old ownership assumption after claims have occurred.
2. Keep the game at `https://dropp-in.netlify.app/`. Configure Supabase's site URL and exact authorized Google return URLs. Enable manual identity linking and anonymous sign-in. Google OAuth credentials stay in Supabase provider configuration, never browser environment variables. Configure Google consent branding and the Supabase callback supplied by that project. Public Google availability requires a real consent test with a non-team account.
3. Choose an owned sending domain. Recommended sender: **DropInn <signin@auth.YOUR-DOMAIN>**. Use a separately monitored receiving address, **hello@YOUR-DOMAIN**, for support. The game can stay on Netlify; a `netlify.app` site address does not provide ownership of a sending domain.
4. Configure Resend SMTP in Supabase, verify the required DNS records, and configure both login and email-change templates to display the six-digit token. Use a ten-minute OTP expiry and Supabase's resend/verification rate limits. Do not deploy a magic-link-only template behind a code-entry screen. Public email delivery requires custom SMTP: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [passwordless codes](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Resend integration](https://supabase.com/partners/resend).
5. Set server-only `DROPINN_GOOGLE_AUTH_ENABLED=1` and/or `DROPINN_EMAIL_AUTH_ENABLED=1` after their live checks. Disabled providers show honest unavailable messages. These are presentation rollout switches, not security controls for Supabase Auth.
6. Verify the deployed revision in two browser contexts: account upgrade, existing-account recovery, hero edit, rewards, private table membership, Realtime, logout, and login on a second device/browser. Do not claim email delivery, Google consent, or physical-phone behavior from mocks.

This workspace contains no hosted credentials or sending domain. Do not invent a sender, acquire a domain, enable billing, or label the account feature hosted-ready before these prerequisites are met.

## Monetization roadmap

The collection pilot now prioritizes one-off supporter bundles over a subscription: test $10 for two exclusive hat designs and their palettes, with permanent account ownership. All shared stories stay free; earned cosmetics receive comparable art attention. No Thread sales, paid power, randomized purchases, expiring digital packs, or tradable inventory. Billing remains deferred. Existing heroes remain available. See [the collection pilot and business defaults](collections.md).

For global sales, prefer a merchant of record. Paddle remains a candidate pending gaming onboarding. Its published 5% + $0.50 fee would leave $9 from a $10 transaction before other costs under that simple fee assumption. Compare Stripe Managed Payments at the billing milestone, including eligibility and all applicable fees. Sources: [Paddle](https://www.paddle.com/pricing), [Stripe Managed Payments](https://stripe.com/managed-payments).

Keep future payment-customer references, subscription state, purchase receipts, and permanent cosmetic grants separate. Provider webhooks must be authenticated, idempotent, and reconciled for delayed/out-of-order events. Never grant access from a checkout return URL or a local flag. Meter refunds/cancellation separately from permanent grants, and test entitlements before live sales. No provider SDK or billing schema is needed for the account release.

## Content and cost roadmap

Feature an adventure weekly from a growing, reviewed library. This is an editorial rhythm, not a promise to create an entirely new story every week. Expand the [world catalog](world-catalog.md) with recurring original NPCs and locations. Keep stable IDs and versions; personal visit outcomes must not silently become world-wide canon.

Use AI first as an authoring aid followed by human review and static publication. Existing authored fallback remains complete. Before introducing live generation, deduplicate shared narration by resolved event/version, set hard per-account and project budgets, cap input/output and latency, and measure cost per active player. Do not include unlimited live generation in a fixed-price supporter offering. No AI budget or new external calls are enabled here.

Measure save failures, auth completion, guest-recovery success, repeat visits, chapter contributions/completion, and infrastructure cost per active player. Avoid logging credentials, OTPs, recovery proofs, or full private payloads. The current modular Netlify service and Supabase transactions remain the architecture until measured bottlenecks justify another service.

## Verification commands

- `npm test`: pure behavior, hosted-contract mocks, and existing gameplay tests.
- `node scripts/test-database.mjs <fresh-dropinn-container>`: real disposable PostgreSQL migrations, races, RLS, recovery, late rewards and write denial.
- `npm run test:accounts`: real Chromium and Supabase browser SDK with simulated Auth/game responses. Screenshots include 390×844 and 320×568. The runner owns port 5205 and never calls hosted services.
- `npm run test:scene -- --base-url http://127.0.0.1:<local-port>`: maintained local multiplayer scenarios.
- `npm run build`: production TypeScript and bundling.
