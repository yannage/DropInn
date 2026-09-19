# Adventure service setup

Local development uses the same server handler as production, with an isolated in-memory repository. The Vite middleware is for a loopback development server only. Local rooms, messages, and prepared variations last until the server restarts; saved browser heroes remain. Local sessions do not impersonate production accounts.

For hosted multiplayer:

The repository pins Node 22 for builds and includes an explicit server WebSocket transport for Supabase initialization. If Netlify has an existing `AWS_LAMBDA_JS_RUNTIME` override, set it to `nodejs22.x` in Netlify's environment settings and redeploy. This runtime override must be configured in Netlify, not `netlify.toml`.

1. Enable anonymous sign-ins in Supabase Auth, or use an authenticated account.
2. Apply the existing migrations in order, including `supabase/migrations/202609190001_dropinn_v2.sql` and `202609190002_server_character_access.sql` to your Supabase project. The latter grants the server read access to saved heroes without changing player ownership policies. Back up live data before your deployment procedure. V2 uses separate tables and retains legacy rooms.
3. Set browser variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Netlify. Never give either server signing secret or service-role key a `VITE_` prefix.
4. Deploy the Netlify function at `/.netlify/functions/dropinn`; `netlify.toml` routes the browser's `/api/dropinn` requests there. Leave `DROPINN_LOCAL` unset in production. For a Vite development server using production persistence, set `DROPINN_BACKEND=supabase` as well as the server and browser Supabase variables. A static `vite preview` server does not provide the local command service; use `npm run dev` for local play.
5. Validate two independent browser sessions against hosted Supabase before inviting players. Confirm Realtime subscription, simultaneous actions, stale action rejection, refresh/rejoin, abandoned turns, and exactly-once reward updates. Local tests do not establish deployed database behavior.

The endpoint verifies every production bearer token with Supabase Auth. It ignores supplied user identities and character stats, loads the owned character, and pins it for that adventure. Clients cannot write V2 room state. The transactional `dropinn_apply_snapshot` function applies one room revision, a durable command receipt, events, memberships, and reward deltas together. Conflicts retry against fresh room state. Presence uses its own membership update.

## Optional AI

Without AI configuration the complete authored adventure remains playable. Spotlight explains that creative interpretation is unavailable and offers a nearby standard action without spending a token. Optional AI calls have a five-second deadline, with authored fallbacks. They never alter already resolved mechanics. Authored event cards always show the resolution; unavailable narration adds no duplicate summary above those cards.

For the public pilot set `DROPINN_AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL` to a model available to your account that supports Responses structured outputs. Model selection is explicit; an unset model uses authored fallback. Requests set `store:false`. Player text and scene descriptions are submitted to the selected provider.

For local evaluation set `DROPINN_AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, and optionally `OLLAMA_MODEL=qwen3.5:4b`. Ollama must already be running. The hosted function cannot reach Ollama on your personal computer. Use hosted inference for public play.

Run `node scripts/evaluate-ai.mjs --provider ollama` for an opt-in live evaluation of creative, impossible, and adversarial ideas through the actual adapter. `--provider openai` uses the configured hosted model and can incur API charges. It reports latency, validation, and fallbacks without writing game data. A fallback is not counted as a correct model response. Live evaluation is separate from the deterministic unit tests.

Set an optional server-only `DROPINN_SIGNING_SECRET` (a long random secret) to sign creative proposals. Otherwise the service-role secret is used. Signed proposals bind the full validated effect to a player, room, target, and turn; modifying any field invalidates them. Rotation invalidates outstanding previews without affecting played actions.

`prepare` creates a cosmetic telling before play; `play` can consume its `variationId`. `propose` interprets a creative action, which still requires a player commit and the normal game roll. `narrate` is a separate read-only request after a resolution; the client displays authored outcomes immediately and ignores replies for another turn. Generated narration is presentation only.

## Operations

POST JSON to `/.netlify/functions/dropinn` with a bearer session and an `operation`: `list`, `play`, `join`, `read`, `command`, `propose`, `chat`, `report`, `history`, `prepare`, or `narrate`. Local mode instead requires a stable `sessionId` and a selected `character` for joining. Production uses `characterId`. Every response identifies `backend`; failures have a readable `error` and non-2xx status.

Rate limits are per authenticated user, persisted in Supabase for hosted requests. Chat accepts short plain text. Reporting persists private rows in `adventure_reports`; review them through service-role administration and record `reviewed_at`. Mutes are client-side. No automated moderation service or moderator notification is claimed; review reports during the pilot. The rate-limit rows clean old windows during requests. Remove expired `adventure_prepared` rows periodically with your database maintenance routine.

Useful pilot measurements are first-action time, time waiting, chapter duration and completion, five-minute contributions, and return visits. Durable `adventure_events` and membership timestamps permit aggregate analysis without storing model prompts or API credentials in game events.
