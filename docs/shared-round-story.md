# A shared story in each round

Implementation: 2026-09-21; illustrated scroll revision: 2026-09-27. Local verification results are recorded separately in `output/playwright`. This is an interface and authored-presentation change, not a new story, rule set, hosted release, or claim of measured comprehension.

## Design and motivation

The audience is a newcomer arriving alone or with friends for a short cooperative visit. The intended experience is narrative, discovery, and fellowship: understand the situation, inspect a useful target, choose an attempt, then recognize what each person contributed. This follows the [storytelling baseline](storytelling-guide.md) and the installed Game Design Fundamentals GDD and motivation worksheet at feature scale.

The same 60-second choosing and up-to-ten-second reveal govern the loop. Inspection costs no resource. Submission opens a large parchment over the scene: Checking your move, then Waiting for the party, then This round. Recorded rows accumulate, with the first at 350ms and later rows at most 1200ms apart, compressed to finish by 5850ms. Show all reveals without voting; Next round/chapter reveals and uses the existing readiness vote. Turning off paced results still automatically votes. Reduced motion reveals immediately without voting. The next decision can refer back to Last round.

| Motivation | Support | Observation still needed |
| --- | --- | --- |
| Explorers — primary | Current target context and contextual move cues | Can a newcomer explain why an object matters? |
| Socializers — primary | Named contributions, shared consequences, persistent last-round journal | Can players name what someone else did? |
| Achievers — secondary | Existing progress, outcomes and keepsakes | Can players distinguish numeric progress from a changed world state? |
| PvP dominance — not targeted | No competitive mechanic added | Not applicable |
| Autonomy | Inspect-first plus token-first and drag shortcuts | Do players understand that inspection does not spend a move? |
| Competence | Attempts, recorded effects and actual developments are distinct | Can they explain a complication without believing nothing happened? |
| Relatedness | The entire party's round replaces inactive controls | Does support feel connected to the result? |

## Authored context and authority

All four adventures have presentation copy. The three generated adventures own `scene-context` blocks in their existing story packets; `stories:build` validates and regenerates their optional definition fields. Briar Glen uses its flag-driven scene projection and `briarContext.ts`. Route cost copy takes precedence over ordinary context once a route is chosen. Developed cues must not ask players to rescue the same freed person again.

The shared summary groups saved action/consequence events by chapter and turn, deduplicates event IDs, and reads actor names and action sentences from the historical event. It does not substitute current scene names, parse numbers out of prose, sum protection, or assign a shared consequence to one hero. Old events retain their original prose. Not every seated companion performs an action every turn; only recorded companion support appears. Inactivity is labeled separately.

Numeric effects use structured results; scene changes use recorded authored changes. Inspecting, opening a drawer, and replaying a journal do not issue action commands. Failed attempts cannot claim a successful development. The summary and last-round reference derive from persisted events without a new wire field or migration.

Rows use retained human profiles and only identity-matched companions. Target art comes from the recorded chapter, with neutral fallbacks when attribution or art is unavailable. Damage rows identify the affected hero without inventing an attacker or token. Story and effect badges lead; arithmetic and companion rules live in Details. The pending card shows the submitted move without provisional results. Definitive rejection returns to the prepared move; uncertain delivery retains exact-command retry.

## Input, pacing and access

Tap an object to inspect it. Choose one of its supported moves to prepare an action. Choosing a token first or dragging one remains a shortcut. Escape closes inspection and restores focus. Waiting/joining/committed players may inspect without editing a submitted action. Timed holds lock inspection.

Desktop inspection uses a parchment bubble; narrow or short screens allocate context in the dock. Waiting and reveal use a compact status dock. The round parchment is a portal with fixed header/footer, one reading region, a focus trap and inert background. View scene/Escape dismisses without canceling the submitted action; Open round scroll restores it. Dismissal lasts for this round. The new choosing turn closes the live recap and returns focus to play. Last round uses the same illustrated rows with all results visible and no animation.

Opening the parchment does not resize the scene. The single narrator keeps its playback state while its controls move into the parchment. New rows follow only while the reader is at the bottom; manual scrolling or opening Details stops following and offers New results. Story history keeps its existing reading position and modes; a player already reading it is not interrupted by an automatic result overlay. Completion retains the parchment with recorded rewards and Collect your recap.

The dedicated local runner is `npm run test:round-scroll` (default loopback port 5198). It covers submission versus selection, waiting, dismissal, cumulative/manual reading, exact retries, definite rejection, separate reveal/readiness controls, keyboard access, reduced motion, history and 320×568, 390×844, 1280×900, 740×360 and 844×390 layouts. The existing scene runner covers four players, lost-response reload and all Briar Glen chapters; the adventure and mobile runners cover the other stories and entry/drawer flows.

## Acceptance

### Local verification — 2026-09-27

- Production build and 83 focused unit tests passed, covering cumulative timestamp pacing, historical attribution, legacy results, Protect/Mend, guidance, story history and pending-command recovery.
- `playtest-round-scroll.mjs`: ten check groups passed, including five phone/desktop/landscape sizes, fixed controls, loaded token art, stable scene bounds on dismissal, manual reading, separate Show all/readiness, exact retry, definite rejection, keyboard focus and reduced motion. Evidence: `output/playwright/round-scroll-results.json` and `round-scroll-*.png`.
- `playtest-scene.mjs`: the local scene suite passed through Briar Glen completion, four-player attribution/readiness, response-loss reload, timed releases, locked inspection, chapter rewards and the mocked narrator bridge. `output/playwright/scene-integration-results.json` distinguishes real command-handler checks from injected presentation snapshots.
- The mobile runner passed at 320×568, 390×844, 412×844 and 1280×900. The adventure runner completed Teacup, Tomorrow and Orchard through all three chapters, route selection and reconnect, including Story reading-position preservation.

These are local browser emulation and command-handler results. No hosted release, live Realtime check, physical-phone check or uncoached comprehension study was performed for this revision.

Automated coverage should establish: historical attribution after departure; duplicate delivery; multiple actors on one target; legacy results; actual failures and costs; Protect/Mend; companion support; chapter transitions; inspection without command mutation; same recap across clients; drag/tap/keyboard; reconnect/retry; and all authored target states. Browser screenshots must include 390×844, 320×568, desktop and tall narrow layouts. Hosted Supabase/Realtime and physical phones are separate evidence.

Human acceptance remains open. With Story closed, ask a new player what is happening, why one target is useful, what a teammate just did, and what remains unresolved. Record answers; do not infer understanding or fun from clicks or test passes.
