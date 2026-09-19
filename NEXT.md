# DropInn follow-up work

## Implemented baseline

The default V2 app includes live discovery, Play Now, saved heroes, four-seat companion support, safe joining/leaving, timed simultaneous turns, contextual tokens, three authored Briar Glen chapters, signed Spotlight proposals, contribution recaps and durable reward handling. Optional AI adapters, chat, mute/report controls and the server-authoritative Supabase persistence path are in the repository. The prior prototype remains at `/?legacy=1`.

## Before a public pilot

- Deploy the migrations and Netlify function to the intended hosted environment; configure anonymous Supabase authentication, Realtime, and server-only credentials. Hosted deployment has not been completed.
- Confirm the actual hosted authentication, multi-session updates, reconnect behavior and reward persistence. Local service behavior is not evidence that production is configured.
- Evaluate real model responses and latency through `scripts/evaluate-ai.mjs`; choose a hosted model for the pilot. The OpenAI/Ollama adapters and authored fallbacks are implemented, but actual provider quality has not been established.
- Establish a person/process to review `adventure_reports` and mark reviewed rows. Mute is local to a player; reporting alone does not notify a moderator.
- Run friend-group sessions with novices and experienced players, including five-minute visits, mixed parties and mid-chapter arrivals. Human playtesting has not been completed.

## Learn from the pilot

Aim for a first meaningful action within a minute, several visible contributions during a five-minute visit, understandable personal consequences, and voluntary return visits. Measure chapter pacing across different party sizes and distinguish fast participation from waiting.

`scripts/pilot-metrics.sql` is a read-only aggregate starting point for hosted data. Its first-action metric runs from **seat arrival to resolved action**, not page launch or commit time; visit duration includes time spent reading or waiting. Return frequency refers to the same anonymous identity. These are behavioral proxies and do not establish subjective satisfaction or the reason someone left. Use conversations with players alongside the data.

## Development reminders

- Use `npm run dev` for local play; `npm run preview` is static and has no adventure endpoint.
- Restart Vite after server-side changes because its local handler is cached. Restarting clears in-memory local rooms and chat, while browser hero data remains.
- Keep credentials out of browser variables. Deployment and optional model configuration live in [server/DROPINN.md](server/DROPINN.md).
- Tune the authored adventure before expanding generated content. Prepared variations currently alter title/atmosphere, not mechanics or chapter topology.
