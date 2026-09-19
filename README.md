# DropInn

A cooperative tabletop adventure for a spare five minutes. Join Briar Glen, play a token, change the scene, and leave whenever you need to. Empty seats are clearly labeled AI companions.

## Run locally

```sh
npm install
npm run dev
```

Vite serves both the interface and `/api/dropinn`, using the same command handler as the hosted app with an isolated in-memory room repository. No API key or Supabase project is required for authored play. Local heroes and earned keepsakes survive browser refreshes; local rooms last for the development server's lifetime. Local discovery includes only sessions on this development server, not public internet players.

Open `/?session=host` and `/?session=guest` to simulate separate visitors. The optional `?room=CODE` link joins an existing adventure. The original prototype and saved legacy rooms remain available at `/?legacy=1`.

## The loop

- **Play Now:** match an open adventure or start immediately with companions.
- **Bring friends:** start a private friend table from the lobby. It is excluded from public discovery and Play Now. Share the full invitation link; new members cannot enter using its short code alone. Anyone holding the link can join and members may reshare it. Past members can return from their recap when a seat is available.
- **Catch up:** the current situation and objective fit in a short scene panel.
- **Contribute:** drag Fight, Influence, Investigate, or Assist coins onto cards on the felt table. Tapping and keyboard selection work too; review the effect before committing. Class traits and abilities matter.
- **Feel the consequence:** successful interactions change scene cards and open new approaches. Your result shows the roll, what changed, and an opening for your next move.
- **Improvise:** one Spotlight per chapter can propose cover, distraction, a discovery, or a rescue. The server validates the proposal; the player confirms it before spending anything.
- **Borrow a spark:** tap an authored Spotlight suggestion for a supported attempt without typing or an AI connection. Edited ideas go through normal interpretation, and every attempt still requires confirmation and a roll.
- **Keep moving:** simultaneous 30-second turns, early resolution when humans are ready, and brief result reveals. Missed turns do not invent dialogue or spend Spotlight.
- **Play together:** see teammates' committed approaches and targets. Send a quick Cheers, Thanks, or Clever reaction; bubbles expire, respect mute, and never change game mechanics. Reactions have a four-second server cooldown and do not block submitting your move.
- **Leave freely:** retain contributions and rewards. Returning visitors can inspect their chapter outcomes.
- **Return to your story:** unread chapter endings are highlighted in recent visits; keepsakes show their origin and your recorded chapter contribution. Read markers and dismissed guidance are remembered in this browser.

Briar Glen has three bounded chapters: missing livestock, the riverside hunt, and the chapel. Every chapter has success, mixed, and setback closure. The room parks when no humans remain. Companions cannot advance an unattended story.

Holding a coin grows it until it pops back to normal size. This is cosmetic: it never changes a roll, commits an action, or spends Spotlight. Table sounds are off by default and can be toggled beside the table. Reduced-motion preferences disable growth and decorative animation.

## AI providers

Copy the variables you need from `.env.example` into `.env.local`. For local experiments set `DROPINN_AI_PROVIDER=ollama` and run `qwen3.5:4b` in Ollama. For the hosted pilot use `DROPINN_AI_PROVIDER=openai`, `OPENAI_API_KEY`, and an explicitly configured `OPENAI_MODEL` supporting structured outputs.

Generation has a five-second deadline. Authored narration and supported standard alternatives keep gameplay working when the provider is disabled, cold, slow, or unavailable. AI never sets dice, HP, XP, rewards, or mechanical room state. Variations change atmosphere while preserving the authored adventure's supported targets and rules. Run `node scripts/evaluate-ai.mjs --provider ollama` (or `--provider openai`) to measure the configured provider before enabling it for players.

## Hosted setup

The production app uses Supabase anonymous authentication and a Netlify function. Apply the existing Supabase migrations and the new `202609190001_dropinn_v2.sql` migration before enabling v2. Configure the public Supabase URL/anon key and server-only service credentials in Netlify. See [server setup](server/DROPINN.md) for the full deployment contract.

V2 uses separate tables and preserves legacy rooms and characters. Room mutations are committed with revision checks; rewards and durable events are part of that transaction. Clients subscribe to updates and request deadline processing; presence writes do not replace the game snapshot.

Friend-table visibility and invitation keys are stored in the existing member-readable room snapshot, so this change needs no additional migration. New private rooms get a random invitation key; the shared URL carries it in a fragment rather than its query string. The server validates it before first admission. Direct room reads remain restricted to members by the existing API checks and Supabase policies. Friend-table links do not currently expire or support revocation. Deploy the updated client and function together, then verify private discovery exclusion and invitation admission on the hosted service.

## Verification

```sh
npm test
npm run build
```

The build checks the browser, command server, and Netlify function. Tests cover bounded adventures, joins/departures, duplicate and stale commands, rewards, validated creativity, and AI failures. Browser QA should include two sessions, mobile layouts, refresh recovery, leave/rejoin, and a complete three-chapter run.

For an opt-in hosted integration check:

```sh
node scripts/smoke-hosted.mjs https://dropp-in.netlify.app
# Include all three chapters (several minutes):
node scripts/smoke-hosted.mjs https://dropp-in.netlify.app --full
```

This creates two anonymous QA accounts, heroes, and a separate adventure. It checks admission, simultaneous actions, duplicate commands, leave/rejoin, history and persisted rewards, then releases both seats. QA accounts and participated-in adventures remain in Supabase for inspection. It discovers only public browser configuration; no service-role key is needed or logged. For deployments using legacy anonymous keys, supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the process environment. Realtime delivery and physical-device behavior still need browser/device testing.

To verify migrations and actual transaction races in a **fresh disposable PostgreSQL container** (Docker required):

```sh
docker run --rm --name dropinn-db-qa -e POSTGRES_HOST_AUTH_METHOD=trust -d postgres:17-alpine
# Wait until `docker exec dropinn-db-qa pg_isready -U postgres` reports ready.
node scripts/test-database.mjs
docker stop dropinn-db-qa
```

This test creates test-only Auth stubs and users, applies every migration, and checks concurrent revisions, duplicate rewards, and read/write permissions. It never connects to the hosted project. Hosted Auth, Realtime, and Netlify integration still need deployment testing. `npm run preview` is static-only; use `npm run dev` for the local command endpoint.

For pilot playtests, measure first action from participant join time, actions and outcomes from durable events, and visit length from join/departure records. Target first action within 60 seconds; assess short visits and chapter completion rather than maximizing time spent.

`scripts/pilot-metrics.sql` supplies read-only aggregate proxies, with limitations documented in the query. [NEXT.md](NEXT.md) tracks hosted deployment, provider evaluation, and human playtesting still needed before a public pilot.
