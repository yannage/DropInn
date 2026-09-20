# Scene playtest evidence

Verified on 2026-09-20 against the uncommitted scene implementation based on `6473a9a`. This records local implementation evidence, not a deployment or a human usability study.

## Automated checks

- `npm test`: 180 tests across 16 files passed. Reducer, command-service, store and release-controller cases cover execution boundaries, strongest protection/cover, contribution rewards, reversed commit order, signed Spotlight, duplicate commands, stale turns, downed players, companions, departing threatened seats, legacy snapshots and parking.
- `npm run build`: TypeScript and the production Vite bundle passed.
- `npm run art:check`: 40 PNG inventory entries and 17 new WebP derivative hashes passed. The derivatives preserve every decoded RGBA pixel. All 14 new cutouts have transparency and unclipped opaque bounds. The art review includes 48/64/128px thumbnails on light/dark backgrounds and portrait background crops.

## Browser integration

Run the local Vite app, then `npm run test:scene -- --base-url http://localhost:5198` (use the port of that server). The maintained runner is `scripts/playtest-scene.mjs`. It creates two fresh Chromium contexts and an isolated instance of the real `createDropinnHandler`, intercepting the app's API requests into that handler. Both browser and server clocks advance together between scenario boundaries. Normal gestures use elapsed wall time. The handler cannot call a hosted backend or model provider.

The run passed private invitation admission, a pending join, shared turn resolution, and progression through all three chapters. Detailed river and chapel checks passed at **390×844 and 320×568**, with every scene/hero target at least 44px and no document scrolling. Separate village/desktop layout checks passed at those phone sizes and 1280×900; all 23 visible table buttons fit and meet 44px minimum dimensions.

The interaction run also verified:

- Real pointer release in the bonus window, early keyboard release, assisted 800ms release, and ordinary Roll now.
- Protect blocking three with good execution and two after a missed release.
- Pointer cancellation and keyboard focus cancellation sending no move.
- Holding across the server deadline sending no move and not extending the turn.
- Valid Help dragging, an invalid Fight drop, selection of every available scene target, and Story drawer keyboard focus trapping/restoration.
- An authored Spotlight suggestion, signed preview, reviewed selection, and timed commitment.
- A committed move whose response was deliberately lost: the retry retained its command ID and action/timing, reload restored the pending payload, receipt recovery succeeded, and only one contribution was awarded.

Separate, explicitly labeled client-snapshot fixtures verify the presentation of a blocked strike, an averted strike with no damage event, a successful target result following a teammate's failure, and healing/damage appearing together on one hero. They test rendering, not server resolution. See `integration-render-fixture-results.png`.

There were no browser page exceptions or model/hosted calls. Expected console network errors correspond to deliberately lost responses, an injected 503 read failure, and Google Fonts blocked by the maintained runner's origin guard. All QA identities, rooms and receipts belong to the runner's disposable local handler.

Generated evidence stays in ignored `output/playwright/`: `scene-integration-results.json`, `integration-{river,chapel}-{390,320}.png`, `scene-final-{390,320,1280}.png`, and `scene-art-review.png`. The separate final layout script used a frozen read snapshot, so those screenshots establish layout only; the integration runner establishes command behavior.

## Accessibility and remaining observations

Tap/keyboard equivalents, Roll now, the persisted assisted setting, stationary commitment controls and reduced-motion styling follow the relevant alternatives described by [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/). This is not a claim of full accessibility conformance. A 250×400 effective viewport reflowed to keep controls reachable, and reduced-motion mode was inspected. Physical device text scaling, mobile screen readers and on-screen keyboard behavior still need device testing.

The initial 30-second choosing period, six-second reveal and 650–950ms bonus window remain unchanged. Human sessions must measure time to first meaningful action, actual scrolling, recognition of the threatened hero, the progress-versus-protection choice, and whether players can explain consequences without opening Story. The smallest viewport deliberately spends more space on reachable controls; evaluate the balance between illustration size and legibility on a physical phone.

No deployment was performed. A separately authorized rollout still needs hosted API, independent-browser Realtime/reconnect and physical-phone verification. Local routing through the real handler does not verify Supabase transport or persistence.
