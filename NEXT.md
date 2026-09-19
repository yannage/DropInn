# DropInn follow-up work

## Implemented baseline

The default V2 app includes live discovery, Play Now, saved heroes, four-seat companion support, safe joining/leaving, timed simultaneous turns, contextual tokens, three authored Briar Glen chapters, signed Spotlight proposals, contribution recaps and durable reward handling. Optional AI adapters, chat, mute/report controls and the server-authoritative Supabase persistence path are in the repository. The prior prototype remains at `/?legacy=1`.

## Prioritized task list

### 1. Finish hosted reliability

- [x] Confirm fresh accounts can save a hero and enter an adventure on the live site.
- [x] Run all three hosted chapters with two independent accounts and verify concurrent actions, duplicate commands, history, and rewards reloaded from Supabase. Browser transport/reconnect and physical-phone playtests remain separate checks.
- [x] Add a deployment smoke check for authentication, hero permissions, required tables/functions, and room creation (`scripts/smoke-hosted.mjs`).
- [x] Preserve specific server errors and refresh hero ownership before admission; recover from failed startup or changed anonymous accounts without clearing saved data.

### 2. Make each turn change the scene

- [x] Update target descriptions and available actions when Mara is freed, the boat moves, or the ward is repaired.
- [x] Replace completed interactions with a new opportunity so repeated rounds feel like a developing situation.
- [x] Show a compact personal consequence after each action: what changed, who benefited, and what is possible next.
- [x] Add restrained dice, token, and consequence animation, plus optional sound with mute and reduced-motion support.
- [x] Add a felt table with draggable action coins, compatible-target feedback, tap/keyboard alternatives, and cosmetic hold-to-grow/reset interaction.

### 3. Prove creative play with a real provider

- [ ] Configure and evaluate hosted Spotlight interpretation with feasible, impossible, ambiguous, and adversarial ideas.
- [ ] Verify preview accuracy, bounded effects, five-second fallback, and token preservation on failure.
- [x] Add tappable, chapter-specific Spotlight suggestions. Authored suggestions work without inference, get signed server previews, and spend a token only on confirmation; changed/obsolete suggestions do not bypass interpretation.

### 4. Test the five-minute visit on phones

- [ ] Playtest with tabletop newcomers and experienced players; time app opening to first meaningful action.
- [ ] Check one-handed controls, small screens, keyboard focus, and the on-screen keyboard during Spotlight/chat.
  - Automated browser checks passed at 390px for touch drag, mouse drag, invalid drops, keyboard selection, long-hold reset, horizontal overflow and reduced-motion behavior. Physical-phone and on-screen-keyboard checks remain.
- [ ] Tune turn and result-reveal pacing using observed waiting time and missed turns.
- [x] Add a short first-move guide explaining placement and confirmation; dismiss it manually or by confirming a move, and remember that choice in this browser.

### 5. Give players a reason to return

- [x] Present keepsakes with their chapter, story context, and the player's recorded contribution from that chapter. Older recaps fall back to origin context.
- [x] Highlight unread chapter endings in recent visits, prioritize those visits, and remember which endings were opened. Read markers are local to this browser.
- [ ] Add optional account recovery/upgrade so anonymous heroes can survive switching devices.
- [ ] Explore cosmetic hero choices while preserving equal starting power.

### 6. Expand the experience after the pilot

- [ ] Add a second authored adventure with a distinct situation, such as a runaway airship or a tavern mystery.
- [ ] Support private friend tables alongside public drop-in play.
- [ ] Add lightweight reactions and clearer teammate intentions without requiring chat.
- [ ] Build a small report-review workflow and basic operational metrics.
- [ ] Add community story pitches, a curator queue, revision feedback and reviewed publication. See [community story workflow](docs/community-stories.md). First extract an adventure registry and prove a second authored adventure; submissions are future work, not part of this MVP pass.

## Before a public pilot

- The site and server are deployed to Netlify. Fresh anonymous authentication, hero creation, admission, and simultaneous turns now pass on the hosted service. The new table/scene UX in this working tree still needs deployment.
- A hosted API run completed all three chapters with two fresh anonymous accounts, simultaneous actions, duplicate-command checks, and persisted XP/keepsakes. Continue browser testing for Realtime delivery and network reconnect behavior; API polling alone does not verify those transports.
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
