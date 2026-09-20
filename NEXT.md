# DropInn follow-up work

## Implemented baseline

The default V2 app includes live discovery, Play Now, saved heroes, four-seat companion support, safe joining/leaving, timed simultaneous turns, contextual tokens, three authored Briar Glen chapters, signed Spotlight proposals, contribution recaps and durable reward handling. Optional AI adapters, chat, mute/report controls and the server-authoritative Supabase persistence path are in the repository. The prior prototype remains at `/?legacy=1`.

The current scene-stage pass adds a fixed action dock, illustrated scene interactions, optional-reading drawers, announced combat intent, guaranteed Protect, timed release and persisted uncertain-move recovery. All three chapters use the new components and 17 new illustrations. Local tests, build and browser checks passed; see [scene playtest evidence](docs/scene-playtest.md) for the backend, scenarios and limitations. Hosted and human evidence remain separate.

## Scene-stage acceptance and rollout

- [x] Run the production build and two-browser local integration checks for this version, recording the base revision and actual backend.
- [x] At 390×844 and 320×568, reach scene targets and the threatened hero without document scrolling; verify 44px interaction targets, keyboard paths, drawer focus/return and reduced motion. Small effective viewports reflow; physical-device text scaling remains below.
- [x] Verify normal, missed and assisted release, cancellation, 1200ms automatic release, turn expiry, reviewed Spotlight confirmation and unchanged timing/command ID after response loss plus reload/retry. Browser and deterministic controller tests cover complementary cases.
- [x] Verify concurrent local results/developed artwork and reducer protection/reward invariants: multiple Protect actions and party cover use the strongest value, and downed Protect earns contribution/chapter rewards. Human comprehension remains below.
- [x] Verify late joins, departing threatened seats, old snapshots, parked/resumed rooms and later rewards in focused tests; private pending admission also passed browser integration. Existing JSON persistence needs no schema migration for these additions.
- [ ] Check physical-device text scaling, screen readers, one-handed use and on-screen keyboards with the new stage.
- [ ] Deploy through a separately authorized rollout, then run hosted API, independent-browser Realtime/reconnect and physical-phone checks. Prior hosted results apply to the older deployment.
- [ ] Observe newcomers and experienced players: time the first meaningful action, count scrolling, ask what changed without opening the journal, and tune the 30-second turn/six-second reveal/650–950ms release window from observations.

## Prioritized task list

### 1. Finish hosted reliability

- [x] Confirm fresh accounts can save a hero and enter an adventure on the live site.
- [x] Run all three hosted chapters with two independent accounts and verify concurrent actions, duplicate commands, history, and rewards reloaded from Supabase. Browser transport/reconnect and physical-phone playtests remain separate checks.
- [x] Add a deployment smoke check for authentication, hero permissions, required tables/functions, and room creation (`scripts/smoke-hosted.mjs`).
- [x] Preserve specific server errors and refresh hero ownership before admission; recover from failed startup or changed anonymous accounts without clearing saved data.

- [x] Preserve the saved table through temporary read failures, show connection/retry feedback, refresh on network return, and clear recovered background errors separately from action errors. Mobile browser API interruption/reload/recovery verified locally; hosted Realtime and physical network checks remain.

### 2. Make each turn change the scene

- [x] Update target descriptions and available actions when Mara is freed, the boat moves, or the ward is repaired.
- [x] Replace completed interactions with a new opportunity so repeated rounds feel like a developing situation.
- [x] Show a compact personal consequence after each action: what changed, who benefited, and what is possible next.
- [x] Add restrained dice, token, and consequence animation, plus optional sound with mute and reduced-motion support.
- [x] Add draggable action coins, compatible-target feedback and tap/keyboard alternatives. The scene-stage pass replaces the earlier cosmetic hold-to-grow/reset gesture with a separate timed commitment control.

- [x] Add bounded teamwork: different committed human tokens at the same target grant each paired roll +1, capped at one. Show teammate approaches on target cards, preview current insight/distraction/teamwork support, and explain applied bonuses in results. Engine and two-player mobile browser checks pass; tune balance with real parties.

### 3. Prove creative play with a real provider

- [ ] Configure and evaluate hosted Spotlight interpretation with feasible, impossible, ambiguous, and adversarial ideas.
  - Local `qwen3.5:4b` evaluated on 2026-09-19: seven cases all returned fallbacks near the five-second deadline; no generated proposals could be scored. See [evaluation notes](docs/ai-evaluation.md). Hosted evaluation remains outstanding.
- [ ] Verify preview accuracy, bounded effects, five-second fallback, and token preservation on failure.
- [x] Add tappable, chapter-specific Spotlight suggestions. Authored suggestions work without inference, get signed server previews, and spend a token only on confirmation; changed/obsolete suggestions do not bypass interpretation.

### 4. Test the five-minute visit on phones

- [ ] Playtest with tabletop newcomers and experienced players; time app opening to first meaningful action.
- [ ] Check one-handed controls, small screens, keyboard focus, and the on-screen keyboard during Spotlight/chat.
  - New stage checks passed at 390×844 and 320×568 for real pointer dragging, invalid drops, keyboard selection/timing, overflow and drawer focus. Physical-phone and on-screen-keyboard checks remain; see [current evidence](docs/scene-playtest.md).
- [ ] Tune turn and result-reveal pacing using observed waiting time and missed turns.
- [x] Introduce the action loop with a short first-move guide. The current stage uses one situation sentence, compatible target highlights and a fixed dock hint; extended catch-up lives in Story.

### 5. Give players a reason to return

- [x] Present keepsakes with their chapter, story context, and the player's recorded contribution from that chapter. Older recaps fall back to origin context.
- [x] Highlight unread chapter endings in recent visits, prioritize those visits, and remember which endings were opened. Read markers are local to this browser.
- [ ] Add optional account recovery/upgrade so anonymous heroes can survive switching devices.
- [x] Add six saved hero colors with a live preview and matching lobby/table badges. Server validation preserves the chosen color while normalizing starting power; appearance changes preserve earned rewards. Mobile browser persistence and admission checks pass.

### 6. Expand the experience after the pilot

- [ ] Add a second authored adventure with a distinct situation, such as a runaway airship or a tavern mystery.
- [x] Support private friend tables alongside public drop-in play: hidden from discovery/matching, full invitation required for new members, saved-member return, and stale-seat recovery. Anyone with a shared full link can join; existing members may reshare it. Browser and local service checks pass; verify hosted behavior after deployment.
- [x] Add Cheers/Thanks/Clever reactions with short-lived animated bubbles, mute support, and a server-enforced cooldown. Show each teammate's committed token and target without requiring chat. Reactions never affect rewards, deadlines, or actions.
- [ ] Build a small report-review workflow and basic operational metrics.
- [ ] Add community story pitches, a curator queue, revision feedback and reviewed publication. See [community story workflow](docs/community-stories.md). First extract an adventure registry and prove a second authored adventure; submissions are future work, not part of this MVP pass.

## Further design iterations

- **Gameplay:** build an adventure registry and a second authored story with a different core problem; explore a visible chapter choice whose consequences carry into the next scene. Playtest whether teamwork creates interesting cooperation or makes piling onto one target too dominant before adding more bonuses.
- **Visual polish:** validate the new stage's composition and developed-state art on narrow screens; give chapter transitions a brief illustrated payoff that never blocks joining or leaving. Keep reduced-motion and keyboard alternatives.
- **Functionality:** prioritize optional account recovery, hosted reconnect/provider checks, and a practical report-review workflow. These remain more valuable for public launch than additional generated story volume.

## Before a public pilot

- The site and server are deployed to Netlify. Fresh anonymous authentication, hero creation, admission, and simultaneous turns now pass on the hosted service. The new table/scene UX in this working tree still needs deployment.
- A hosted API run completed all three chapters with two fresh anonymous accounts, simultaneous actions, duplicate-command checks, and persisted XP/keepsakes. Continue browser testing for Realtime delivery and network reconnect behavior; API polling alone does not verify those transports.
- Evaluate real model responses and latency through `scripts/evaluate-ai.mjs`; choose a hosted model for the pilot. The OpenAI/Ollama adapters and authored fallbacks are implemented, but actual provider quality has not been established.
- Establish a person/process to review `adventure_reports` and mark reviewed rows. Mute is local to a player; reporting alone does not notify a moderator.
- Run friend-group sessions with novices and experienced players, including five-minute visits, mixed parties and mid-chapter arrivals. Human playtesting has not been completed.

## Learn from the pilot

Aim for a first meaningful action within a minute, several visible contributions during a five-minute visit, understandable personal consequences, and voluntary return visits. Measure chapter pacing across different party sizes and distinguish fast participation from waiting.

`scripts/pilot-metrics.sql` is a read-only aggregate starting point for hosted data. Its first-action metric runs from **seat arrival to resolved contribution**, including Protect and legacy rolled actions, not page launch or commit time; visit duration includes time spent reading or waiting. Return frequency refers to the same anonymous identity. These are behavioral proxies and do not establish subjective satisfaction or the reason someone left. Use conversations with players alongside the data.

## Development reminders

- Use `npm run dev` for local play; `npm run preview` is static and has no adventure endpoint.
- Restart Vite after server-side changes because its local handler is cached. Restarting clears in-memory local rooms and chat, while browser hero data remains.
- Keep credentials out of browser variables. Deployment and optional model configuration live in [server/DROPINN.md](server/DROPINN.md).
- Tune the authored adventure before expanding generated content. Prepared variations currently alter title/atmosphere, not mechanics or chapter topology.
