# DropInn follow-up work

## Implemented baseline

The default V2 app includes live discovery, Play [selected story], saved heroes, four-seat companion support, safe joining/leaving, timed simultaneous turns, contextual moves, three authored Briar Glen chapters, signed Spotlight proposals, contribution recaps and durable reward handling. Optional AI adapters, chat, mute/report controls and the server-authoritative Supabase persistence path are in the repository. The prior prototype remains at `/?legacy=1`.

The current scene-stage pass adds a fixed action dock, illustrated scene interactions, optional-reading drawers, announced combat intent, guaranteed Protect, timed release and persisted uncertain-move recovery. All three chapters use the new components and 17 new illustrations. Local tests, build and browser checks passed; see [scene playtest evidence](docs/scene-playtest.md) for the backend, scenarios and limitations. Hosted and human evidence remain separate.

## Gemward story table — October 3, 2026

New rooms use [Gemward v3](docs/stories/gemward-v3.md). The [story table](docs/story-table.md) keeps the current problem and confirmed consequences readable between turns. An opening about the missing beacon and evening ferry establishes who needs help. Distinct leads and preparations replace generic town/finale progress; players can explicitly set out or finish together through ordinary prepared/released actions. Optional help carries into combat or the ending. The six-node route map, shared pouch and irreversible finale choice remain, with all v1/v2 rooms pinned to their existing rules.

- [x] Explore eighteen mechanically different pacing concepts and document the bounded implementation hypothesis in the [design search](docs/design/gemward-pacing-agency-search.md). Keep the Story Circle as a causal authoring backbone while letting preparation order vary.
- [x] Add versioned, persisted preparation facts, source-event attribution, explicit departure/completion, visible active-round fallbacks, one-use lantern protection, reachable hill-road damage and contextual Spark dust. Keep server authority, exact retries and reward boundaries.
- [x] Add current-v3 opening audio for all eight voices while retaining every pinned opening. Verify 144 WAV clips / 24,920,736 bytes, all ten opening-library tests and five local real-WAV browser scenarios. Model transfer/initialization is controlled in that harness; it does not establish live inference latency.
- [x] Verify 784 unit/service tests, final production build, 63 source-matched v3 browser checks and 43 pinned-v2 compatibility checks. Both routes/endings, exact retry/reload, confirmed consequences, enlarged text and visible Dust conflict/removal pass locally. Evidence and source fingerprint are in [story-table verification](docs/story-table.md#boundaries-and-verification).
- [ ] Observe newcomers and pairs explaining the first consequence, why their path opened, a later payoff from preparation and the final sacrifice. Automated checks cannot establish fun or replay interest. Hosted and physical-device checks remain separate.

## Earlier Gemward expedition — October 3, 2026

The earlier [Gemward v2 journey](docs/stories/gemward-v2.md) added a six-node connected map with two independent 30-second travel votes, shared pouch provenance/history, separate tower/square finales and an irreversible cost applied only at finale completion. Chronicle is on demand; Journey opens at travel. At that release, new rooms pinned v2 and existing v1 rooms kept their behavior. Twenty bespoke raster illustrations cover eight environments, five quest objects, two enemies and five supplies.

- [x] Generate and integrate all twenty PNG/WebP pairs with exact prompt/provenance records; inspect full outputs, landscape/portrait crops and 128/64/48px cutouts on pale/dark surfaces. Verify alpha bounds and lossless RGBA equality; `npm run art:check` passes.
- [x] Pass the current full Vitest suite: 746 unit/service tests, including v2 travel/provenance/deferred-cost coverage. The art inventory check also passes.
- [x] Pass the final production build after all UI CSS/map-memory/narrator-copy changes. The source-matched Journey runner passes 36 checks, zero errors, through actual two-player Warehouse → Beacon and peaceful Canal → Lantern square paths, including lost vote acknowledgement/reload/exact duplicate, stash items, on-demand history, selected map memories, rewards and 320/390/1280 layouts. This historical harness is now `test:journey:v2`.
- [x] Pass five narrator-opening browser scenarios using real WAV playback with held model transfer/mocked initialization; visually check settings at 320/390. This is not a live inference-latency result.
- [x] Pass the final broad earlier-adventure browser regression: 102 checks, zero failures, browser errors or external/model calls, including automatic narration, failure fallback, retry and subtitles. Earlier harness fixture-binding failures were resolved without gameplay changes. Report: `output/playwright/scene-integration-results.json`.
- [ ] Observe the revised scene/map/pouch loop with newcomers and pairs. Hosted, physical-device and human enjoyment evidence remain separate.

The following completed checks describe **Gemward v1**, before the v2 journey/visual overhaul:

The working tree adds [Gemward: The Missing Light](docs/stories/gemward.md): three independently browsable town locations, shared quest discoveries, warehouse/canal/road chapter patterns, seeded smugglers/ward facts, separate bounded class combat, a three-slot personal stash and a permanent finale choice. A fresh lobby selects Gemward; saved choices and invitations retain their story. Existing pinned adventures remain available. [Runtime and authoring rules](docs/expedition-adventures.md) record the scope.

- [x] Implement the authoritative exploration, route, encounter, stash and ending state in the existing command/snapshot path.
- [x] Pass the full local unit/service suite: `rtk vitest run`, 695 tests; production build and `npm run art:check` passed. Verify the 112-clip opening library, including 16 new Gemward recordings, and all 10 narrator-opening tests.
- [x] Complete the two-player Warehouse/Restore browser run through all three chapters: 21 checks, zero errors, reload, item spending, bounded combat/return, signed authored Spotlight, rewards and 320/390/1280 layouts including prepared release controls. The earlier scene regression passed 102 checks, including exact lost-response/reload/retry; its presentation fixtures remain separately labeled. See [verification scope](docs/expedition-adventures.md#verification-status).
- [ ] Observe newcomers and pairs: can they explain “this interaction opened that route,” choose between countering and class support, spend a consumable, and state the finale's cost? Measure decisions and waiting; no enjoyment improvement has been established.
- [ ] Verify physical phones and hosted persistence/Realtime after a separately authorized rollout. This working-tree expedition has not been deployed.

V1 reused existing matching artwork. V2 now includes bespoke environments, quest props, enemies and supplies; matching NPC illustrations remain reused. Expanded generated story packs remain future work.

## Player clarity pass

The [chapter choice pass](docs/stories/chapter-choices.md) extends the river's visible tradeoffs through all 12 chapters: shared preparation, optional rescues and recoveries, and building versus banking gains. New rooms use Briar v4 and the other stories' v2; released tables retain their behavior. The supplement records rules and verification evidence.

The cooperation follow-up adds accepted teammate plans, contextual overlap advice, current success odds and recorded credit for preparation, payoffs, building, banking and rescues. It preserves existing rules and rewards; player observation below remains the next design check.

The [mobile tabletop pass](docs/player-clarity.md#mobile-tabletop-composition--october-2) gives the scene more room, keeps labels beneath artwork, replaces full-piece selection rings with a marked nameplate, and puts confirmed mobile dice in a dedicated tray. Short-screen subtitles can be peeked without changing narration preferences. Verification and physical-device limits are recorded with the presentation notes.

- [ ] Compare the current versions with their predecessors using uncoached solo players and pairs: can they explain the tradeoff, recognize a setback, coordinate a payoff, and identify later consequences? Check whether guaranteed rescue, repeated preparation or banking one level becomes automatic; tune from observation.
- [ ] Test whether players choose another visit after a clean stopping point. Automated checks cannot establish fun or retention. Broader class abilities remain a separate design experiment.

- [x] Put the game explanation, round loop, ready hero and one story-specific Play action at the entrance. Move story selection and friend admission into named dialogs; keep deeper options below.
- [x] Make target inspection the default path, with contextual authored moves, persistent state guidance, a visible shared goal and hold/release as the primary commitment. Retain **Show tokens** and accessible alternatives.
- [x] Add browser-local, dismissible/replayable first-move teaching and recorded personal consequences. Preserve server rules, deadlines, reward contracts and authored story content.
- [x] Verify the initial onboarding pass with 85 focused tests, production build, and local scene, mobile, adventure and collection browser suites. See [initial clarity evidence](docs/player-clarity.md#local-verification).
- [x] Improve scene/encounter readability, visible approach tradeoffs, landscape controls, recorded contribution feedback, fixed readiness and remembered story selection. The responsive follow-up passed 82 focused tests, production build, 96 scene checks, and local mobile/adventure suites. See [responsive verification](docs/player-clarity.md#responsive-pass-verification).
- [x] Replace the expanding result dock with an illustrated round parchment: immediate submission/waiting state, cumulative recorded results, actor/token/target artwork, optional dice details, separate Show all/readiness, and a compact scene status. See [round scroll behavior and local checks](docs/shared-round-story.md).
- [ ] Run the [uncoached player checks](docs/player-clarity.md) with newcomers, returning players and mid-round arrivals. Automated layout checks do not establish comprehension.
- [ ] Verify this version after a separately authorized hosted rollout and on physical phones; these have not been completed by the clarity pass.

## Scene-stage acceptance and rollout

The local [game-feel pass and skill shortlist](docs/game-feel-direction.md) adds a tactile hand, visible support opportunities, staged result arithmetic and chapter reward feedback. It also records the proposed next mechanics prototypes and the local verification limits; hosted rollout and human pacing review remain open.

- [x] Run the production build and two-browser local integration checks for this version, recording the base revision and actual backend.
- [x] At 390×844 and 320×568, reach scene targets and the threatened hero without document scrolling; verify 44px interaction targets, keyboard paths, drawer focus/return and reduced motion. Small effective viewports reflow; physical-device text scaling remains below.
- [x] Verify normal, missed and assisted release, cancellation, 1200ms automatic release, turn expiry, reviewed Spotlight confirmation and unchanged timing/command ID after response loss plus reload/retry. Browser and deterministic controller tests cover complementary cases.
- [x] Verify concurrent local results/developed artwork and reducer protection/reward invariants: multiple Protect actions and party cover use the strongest value, and downed Protect earns contribution/chapter rewards. Human comprehension remains below.
- [x] Verify late joins, departing threatened seats, old snapshots, parked/resumed rooms and later rewards in focused tests; private pending admission also passed browser integration. Existing JSON persistence needs no schema migration for these additions.
- [ ] Check physical-device text scaling, screen readers, one-handed use and on-screen keyboards with the new stage.
- [ ] Deploy through a separately authorized rollout, then run hosted API, independent-browser Realtime/reconnect and physical-phone checks. Prior hosted results apply to the older deployment.
- [ ] Observe newcomers and experienced players: time the first meaningful action, count scrolling, ask what changed without opening the journal, and tune the 60-second turn, paced reveal and 650–950ms release window from observations.

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
- [x] Introduce the action loop during play with a dismissible first-move guide, suggested inspection targets and persistent state guidance in the contextual dock. The guide can be replayed from action help; extended catch-up lives in Story. Human comprehension remains unverified.

### 5. Give players a reason to return

- [x] Present keepsakes with their chapter, story context, and the player's recorded contribution from that chapter. Older recaps fall back to origin context.
- [x] Highlight unread chapter endings in recent visits, prioritize those visits, and remember which endings were opened. Read markers are local to this browser.
- [ ] Add optional account recovery/upgrade so anonymous heroes can survive switching devices.
- [x] Add six saved hero colors with a live preview and matching lobby/table badges. Server validation preserves the chosen color while normalizing starting power; appearance changes preserve earned rewards. Mobile browser persistence and admission checks pass.

### 6. Expand the experience after the pilot

- [x] Establish [the storytelling and pacing baseline](docs/storytelling-guide.md), a reusable packet template and three complete adventure design drafts: airship rescue, time-loop inn mystery and migrating orchard. Future authoring references the baseline through AGENTS.md.
- [x] Implement a versioned adventure registry and all three story packets as selectable adventures. Branch-directed Help, persistent costs and route endings are implemented. See [runtime scope and verification](docs/playable-adventures.md).
- [ ] Human-playtest the new stories before extending them with the optional Teacup setup bonus, Tomorrow symbol bonus or Orchard shared watering can. These extensions remain design proposals; ordinary scene developments carry the playable baseline.
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

## Living tabletop pass — September 2026

- [x] Replace automatic focused scenes and round overlays with stage action, a visible token hand, dock approaches and explicitly opened history. This supersedes the earlier Show tokens/automatic parchment entries above.
- [x] Implement Briar Glen v2 authored combinations, pinned version lookup, confirmed-event stage playback and bounded opt-in audio/visual feedback.
- [ ] Compare baseline and revised play with humans; record move comprehension, visible consequence, combination discovery, payoff reasoning and desire for another turn. Listen to the mix separately.
- [ ] Deploy the matching client and command service together after local review; hosted rollout is separate.
