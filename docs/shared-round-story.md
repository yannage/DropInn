# A shared story in each round

Implementation: 2026-09-21. Local verification results are recorded separately in `output/playwright`. This is an interface and authored-presentation change, not a new story, rule set, hosted release, or claim of measured comprehension.

## Design and motivation

The audience is a newcomer arriving alone or with friends for a short cooperative visit. The intended experience is narrative, discovery, and fellowship: understand the situation, inspect a useful target, choose an attempt, then recognize what each person contributed. This follows the [storytelling baseline](storytelling-guide.md) and the installed Game Design Fundamentals GDD and motivation worksheet at feature scale.

The same 30-second choosing and six-second reveal govern the loop. Inspection costs no resource. The opening personal dice beat lasts 1.1 seconds; the party recap remains independently readable. The next decision can refer back to Last round. There is no new economy, progression tier, required checklist, acknowledgement gate, or reward schedule.

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

## Input, pacing and access

Tap an object to inspect it. Choose one of its supported moves to prepare an action. Choosing a token first or dragging one remains a shortcut. Escape closes inspection and restores focus. Waiting/joining/committed players may inspect without editing a submitted action. Timed holds lock inspection.

Desktop inspection uses a parchment bubble; narrow or short screens allocate context in the dock. The six-second reveal uses a bounded, keyboard-scrollable party recap and decorative target callouts. The journal opens in the existing focus-trapped drawer without pausing the clock. Reduced motion omits floating motion and the personal dice beat. One polite announcement summarizes the round, rather than announcing each floating label.

## Acceptance

Automated coverage should establish: historical attribution after departure; duplicate delivery; multiple actors on one target; legacy results; actual failures and costs; Protect/Mend; companion support; chapter transitions; inspection without command mutation; same recap across clients; drag/tap/keyboard; reconnect/retry; and all authored target states. Browser screenshots must include 390×844, 320×568, desktop and tall narrow layouts. Hosted Supabase/Realtime and physical phones are separate evidence.

Human acceptance remains open. With Story closed, ask a new player what is happening, why one target is useful, what a teammate just did, and what remains unresolved. Record answers; do not infer understanding or fun from clicks or test passes.
