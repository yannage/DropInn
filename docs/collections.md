# First tales collection pilot

Implemented locally, 2026-09-25. This is the progression pilot, not a payments release or a validated retention claim.

## Player rules

The four current adventures form **First tales**. Every credited chapter in a new pilot table earns 1 Thread, including the first visit and success, mixed, or setback outcomes. A real contribution qualifies, including a failed roll or guaranteed Help/Protect; spectators and automatic absent-player defense do not. Departed contributors receive the result when the chapter eventually closes. A parked, unfinished chapter has not awarded its Thread yet.

Existing keepsakes still unlock the three original hats. These hats now belong to the account's collection, even when a different owned hero earned the keepsake. Personal keepsake inventories and XP stay on their original heroes. No cosmetic changes starting power.

The Shepherd's floppy hat has four independently selectable palettes (blue, green, red, gold), each costing 3 Thread. The feather trim costs 6. Palette and trim can be combined, and each requires the base hat. Unlocks are permanent; crafting never equips automatically. Use **Wear**, then **Save hero**. Restoring the original color or removing a trim costs nothing. Palette and trim ownership is shared across all account heroes.

The wardrobe shows prices, previews, balance and an optional crafting goal. Goals are saved per account in this browser; ownership, spending and discoveries are hosted account data. **Your discoveries** shows only credited outcomes and indicates unseen endings without revealing their text. All routes pay equally. Color, trim and journal are available without payments, ads, streaks, deadlines or randomized rewards.

## Service and persistence

- `AccountSnapshot.collection` and `operation: 'collection'` return cumulative `earned`, `spent`, `hats`, `styles`, and `discoveries`. Balance is earned minus spent. This pilot has one pack and one balance; introducing another pack requires an explicit wallet migration.
- `operation: 'craft'` accepts `recipeId` and `commandId`. Authentication selects the account; costs, prerequisites and ownership come from server data. `dropinn_craft` locks the account and atomically spends and grants the style. Duplicate command IDs cannot change recipes. Already-owned styles cost zero.
- `collection_credits` and `collection_crafts` retain the original player ID, with ownership resolved through `player_ownership`. Recovery does not copy or reset balances. Separate accounts retain legitimately earned credits on recovery; subsequent credits are deduplicated across identities now owned by the same account for that room/chapter. Stored craft IDs survive recovery.
- New rooms pin `collectionVersion: 1`. Existing rooms retain their original reward policy. The account snapshot wrapper records eligible chapter credits in the same transaction as the room revision, command receipt and existing XP/keepsake rewards. It locks affected accounts before the room and checks that ownership did not change while waiting.
- Hat ownership backfills from exact existing keepsake strings. `CharacterProfile.cosmeticUnlocks` is a derived server projection, not a character-write field. Optional `equipment.hatColor` and `equipment.hatTrim` store style IDs; missing values retain existing visuals. Server save and admission validate the requested outfit against account ownership. The admitted appearance stays pinned through rejoin.
- Network uncertainty preserves the crafting command in browser storage. Retry the same style after reload. Monotonic collection merging prevents a late reward/account response from restoring already-spent Thread. Hosted clients cannot write ledger tables or call their SQL functions directly.
- Local development follows the existing browser-saved XP model: the browser persists deduplicated credits from the real local handler and uses the shared crafting rules. It is a development preview, not evidence of hosted authorization. Hosted authority is tested separately in real disposable Postgres.

## Rollout and verification

Back up the hosted database, apply `202609250001_collections.sql` after the account migration, then deploy the matching service/client. Keep the migration and its ledger on rollback; do not restore an older account wrapper over the new one. A missing collection migration produces an explicit setup error. Payments remain disabled.

Local checks:

- `npm test` and `npm run build`.
- `node scripts/test-database.mjs <fresh-dropinn-container>`: migrations, two real competing purchases, receipt idempotency, insufficient funds, recovery, late rewards, historical account identity, client write denial and concurrent cosmetic saves.
- `npm run test:collections`: real Chromium and an isolated real local handler. Credits across stories; goal progress; palette/trim spending; no automatic equip; save/reload/Cancel; discoveries; keyboard focus; reduced motion; 390×844, 320×568 and desktop.
- `npm run test:accounts` and `npm run test:scene` for account and shared-turn regressions. These do not prove hosted Realtime delivery or physical-phone behavior.
- `node .agents/skills/dropinn-art/scripts/review-heroes.mjs` and `npm run art:check`. The contact sheet includes palettes plus trim across six bodies at 256/64/48px on light and dark backgrounds.

Before public rollout, verify the deployed revision in two authenticated browser contexts: reward arrival over Realtime, an interrupted craft, cross-hero outfits, and a guest claimed by an existing account. No hosted migration, deployment, live sales, physical-phone test or human recruitment is performed by the local pilot implementation.

Local evidence on 2026-09-25: 298 Vitest tests passed; production build passed (existing bundle-size warning); fresh PostgreSQL 17 migration/concurrency checks passed; collection, account, shared-scene and mobile browser suites passed. The collection browser run earned and spent Thread across three stories and verified the combined blue/feather outfit on admission to the fourth. The native hero review passed with 41 sources and 133 compositions, and asset file checks passed. Screenshots and reports are generated under `output/playwright/`.

## Two-week human pilot

Recruit 12–20 players. Ask them to choose a desired style before playing, explain how to earn it without help, and rate purchase optionality if shown the supporter concept. Target at least 80% unaided comprehension. Record actual minutes and credited chapters to that chosen style, whether actions served the party, which stories they chose, and whether they voluntarily return after unlocking it.

Use ledger timestamps and existing membership/events to measure chapter choices, spending and return visits. Separate actual joins from rewards that arrived after departure. Preserve the chosen goal and motivation questions in the playtest notes: they are not inferred from purchase history. Compare against the preceding prototype where available; a 12–20 person study is directional evidence, not a conversion forecast or statistically reliable retention estimate.

If collection is liked but encounters feel repetitive, improve encounter variation. If the favorite-color goal feels slow, lower recipe cost. Do not stretch the grind to compensate for weak replay interest.

## Business defaults for a later release

All stories stay free. Test a $10 one-off supporter bundle with two exclusive hat designs and their palettes, permanent account ownership, clear previews, and continuing availability. Earned items receive comparable art attention. Sell no Thread, progress multipliers or combat power. A future equipment slot must have worthwhile earned options too. Billing integration, provider eligibility, taxes and real prices require their own implementation milestone; this release adds no checkout.

Feature a reviewed existing adventure weekly. Use three new stories and three earned cosmetics per themed release as an initial production budget, with an internal eight-week interval. Do not advertise that cadence before measuring authoring/art/QA capacity. A monthly subscription and advertising remain deferred.

Optional merchandise starts with one sampled shirt for a well-received pack and an accurately described, limited ordering window for print-on-demand production. Calculate contribution after production, shipping subsidy, applicable fees and a support reserve; count the creator's production time too. Do not equate retail revenue with profit.

Illustrative planning only: at a 5% + $0.50 processing fee, a $10 digital sale leaves $9 before other costs; a $1,000 production budget requires at least 112 purchases. An assumed 2% purchase rate implies about 5,600 active pack players. These are assumptions, not measured forecasts. Sources checked during planning: [Paddle pricing](https://www.paddle.com/pricing), [Printful costs](https://help.printful.com/hc/en-us/articles/50261163157905-How-much-does-Printful-cost).
