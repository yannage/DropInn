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
- **Catch up:** the current situation and objective fit in a short scene panel.
- **Contribute:** choose a target and a Fight, Influence, Investigate, or Assist token. Class traits and abilities matter.
- **Improvise:** one Spotlight per chapter can propose cover, distraction, a discovery, or a rescue. The server validates the proposal; the player confirms it before spending anything.
- **Keep moving:** simultaneous 30-second turns, early resolution when humans are ready, and brief result reveals. Missed turns do not invent dialogue or spend Spotlight.
- **Leave freely:** retain contributions and rewards. Returning visitors can inspect their chapter outcomes.

Briar Glen has three bounded chapters: missing livestock, the riverside hunt, and the chapel. Every chapter has success, mixed, and setback closure. The room parks when no humans remain. Companions cannot advance an unattended story.

## AI providers

Copy the variables you need from `.env.example` into `.env.local`. For local experiments set `DROPINN_AI_PROVIDER=ollama` and run `qwen3.5:4b` in Ollama. For the hosted pilot use `DROPINN_AI_PROVIDER=openai`, `OPENAI_API_KEY`, and an explicitly configured `OPENAI_MODEL` supporting structured outputs.

Generation has a five-second deadline. Authored narration and supported standard alternatives keep gameplay working when the provider is disabled, cold, slow, or unavailable. AI never sets dice, HP, XP, rewards, or mechanical room state. Variations change atmosphere while preserving the authored adventure's supported targets and rules. Run `node scripts/evaluate-ai.mjs --provider ollama` (or `--provider openai`) to measure the configured provider before enabling it for players.

## Hosted setup

The production app uses Supabase anonymous authentication and a Netlify function. Apply the existing Supabase migrations and the new `202609190001_dropinn_v2.sql` migration before enabling v2. Configure the public Supabase URL/anon key and server-only service credentials in Netlify. See [server setup](server/DROPINN.md) for the full deployment contract.

V2 uses separate tables and preserves legacy rooms and characters. Room mutations are committed with revision checks; rewards and durable events are part of that transaction. Clients subscribe to updates and request deadline processing; presence writes do not replace the game snapshot.

## Verification

```sh
npm test
npm run build
```

The build checks the browser, command server, and Netlify function. Tests cover bounded adventures, joins/departures, duplicate and stale commands, rewards, validated creativity, and AI failures. Browser QA should include two sessions, mobile layouts, refresh recovery, leave/rejoin, and a complete three-chapter run.

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
