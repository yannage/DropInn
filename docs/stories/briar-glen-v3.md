# Briar Glen: The Broken Bell — river choices

Status: implemented locally; verification record below. Definition ID: `briar-glen`; adventure version: 3. Versions 1 and 2 remain addressable.

Baseline: [storytelling and pacing](../storytelling-guide.md). This packet follows the [story template](TEMPLATE.md), inheriting the unchanged village, chapel, combinations, and full target context from [Briar Glen v2](briar-glen-v2.md). It changes the river predicament and carries its result into the chapel. It is not a hosted publication or a claim of measured enjoyment.

## Promise

Cross a dangerous river together and decide how much effort to spend saving supplies for the chapel. The pack threatens a hero while the current threatens the cargo. A failed rush changes the next decision: take a guaranteed partial salvage or risk recovering everything.

Keep the handmade fantasy tone, Mara and the valley as continuity, three short chapters, four targets, and four visible tokens. A five-to-ten-minute visit remains a target, not a measured duration. Chapter timers and the ten-round cap are unchanged.

## Circle

| Beat | Player-caused event or revealed fact | Visible evidence |
| --- | --- | --- |
| You | Mara and her herd need help. | Village, broken gate, scattered animals. |
| Need | The missing herd was taken toward the river. | Clues and Mara's lead, preserved from v2. |
| Go | The party opens the route out of the village. | Developed village objects and river arrival. |
| Search | Cross while choosing between cargo, progress, and the threatened hero. | Loaded boat, cargo markers, remaining rounds, enemy intent. |
| Find | The ferryman or guaranteed chapter close reveals the guardian's broken ward. | Existing river story development and outcome. |
| Take | Spend a move securing cargo, risk a spill, salvage part, or leave it behind. | Recorded cargo state and explicit chapel benefit/cost. |
| Return | Face Gloamfang and lead the captives home with the supplies actually saved. | Chapel starting condition, repaired ward, open escape route. |
| Change | Restore the protector or leave the valley temporarily safe. | Existing guardian/evacuation ending and personal keepsakes. |

## Chapter 1 — The missing livestock

Objective, arrival, catch-up, rhythm, and all three endings remain v2: help Mara, discover the river lead, and begin the journey. The round-cap path still supplies the indispensable clue.

| Target | Supported interactions | Developed state and follow-up |
| --- | --- | --- |
| Mara | Influence or Help | Safe; ask about the river or support her directions. |
| Gate | Fight, Investigate, Help | Sheltered pen; its existing combination offers progress or safety. |
| Tracks | Investigate, Help | Ward fragment; study its markings or connect the clue. |
| Herd | Influence, Help | Gathered animals; secure them or inspect the ribbon. |

Full `scene-context` and success/mixed/setback text are inherited from the v2 packet and versioned chapter definition.

## Chapter 2 — The riverside hunt

Immediate objective: **Cross the river and decide what supplies to save.**

Arrival: The shadow pack guards a crossing. A loaded boat is afloat against its rope; the current will take unsaved supplies after river round 3, or sooner when the party finishes crossing.

Catch-up: The missing herd was taken to the ruined chapel. The drifting supplies could help there; save them before the third river round ends or the crossing is finished.

| Target | Supported interactions | Developed state and follow-up |
| --- | --- | --- |
| Pack | Fight, Influence, Investigate, Help | Existing threat/approaches remain; dealing with it competes with saving cargo. |
| Reeds | Investigate, Help | Ordinary hidden-path setup while cargo drifts. After a spill, Investigate attempts a full recovery; Help remains ordinary cover/setup. |
| Boat | Fight or Help while drifting | Fight rushes cargo, Help secures it. After a spill, Help salvages part; Influence/Investigate advance the crossing. Once settled, all four tokens advance ordinary play. |
| Ferryman | Influence, Investigate, Help | His warning connects the pack to the guardian; ordinary play remains available. |

The boat stays afloat in every cargo state. Cargo markers sit at the boat, shift to the reeds on a confirmed spill, return on recovery, or become empty marks after loss. Existing art is reused. Every target remains visible.

```scene-context
{
  "situation": "The pack closes in. Secure the drifting supplies, risk rushing them across, or press on without them.",
  "targets": {
    "pack": { "context": "The pack threatens a hero while the current pulls at the cargo.", "actionCues": { "fight": "Hold off the pack", "influence": "Distract the pack", "investigate": "Study the ward-light", "assist": "Support the party" }, "development": { "context": "Keep the pack occupied while the party crosses.", "actionCues": { "fight": "Hold off the pack", "influence": "Distract the pack", "investigate": "Study the ward-light", "assist": "Support the crossing" } } },
    "reeds": { "context": "A concealed path could shelter the crossing.", "actionCues": { "investigate": "Find the concealed path", "assist": "Make cover" }, "development": { "context": "Use the concealed path; after a cargo spill, searching here may recover everything.", "actionCues": { "investigate": "Inspect the reeds", "assist": "Make cover for the crossing" } } },
    "boat": { "context": "The loaded boat drifts against its rope. A safe move secures its supplies; rushing risks a spill.", "actionCues": { "fight": "Rush across with the supplies", "assist": "Secure all the supplies" }, "development": { "context": "The boat remains afloat. Its recorded cargo state determines whether you can salvage supplies or continue the crossing.", "actionCues": { "influence": "Guide the party across", "investigate": "Plan a steady crossing", "assist": "Help at the boat" } } },
    "ferryman": { "context": "The ferryman remembers the chapel guardian.", "actionCues": { "influence": "Ask about the guardian", "investigate": "Follow his warning", "assist": "Steady the crossing" }, "development": { "context": "The broken ward corrupted a protector; the chapel bell may help.", "actionCues": { "influence": "Ask about the bell", "investigate": "Study the ward-light", "assist": "Steady the crossing" } } }
  }
}
```

Runtime cues in `river.ts` distinguish each cargo state more precisely than the two-state authoring format. They never reset cargo because another action repeats.

Success: the pack falls back and everyone crosses; the ferryman reveals the corrupted guardian. Mixed: the party crosses with the pack close behind; the bell clue remains. Setback: a desperate crossing reaches the chapel; a ward-mark supplies the essential clue. Append the actual saved/salvaged/lost cargo result to each ending; a setback no longer claims supplies were lost when they were secured.

## Chapter 3 — The chapel

The v2 guardian confrontation, ward restoration, bell combination, captives, success/mixed/setback endings, and closing images remain. Arrival/catch-up also states the actual supply carryover.

| Target | Supported interactions | Developed state and follow-up |
| --- | --- | --- |
| Gloamfang | Fight, Influence, Investigate, Help | Confront or appeal to the corrupted protector. |
| Ward | Investigate, Influence, Help | Restored stones; sustain their light or appeal to the guardian. |
| Bell | Fight, Investigate, Help | Ringing bell; guide captives and use the existing combination. |
| Captives | Influence, Help | Open escape route; guide the rest home. |

Full `scene-context` and final ending text remain in the v2 packet and versioned chapter definition.

## Cost and resolution contract

Numbers for immediate progress/danger divide by the human count. Cargo is one shared resource; its chapter carryover does not divide.

| Starting state | Move | On success | On miss |
| --- | --- | --- | --- |
| Drifting | Help boat: secure | Guaranteed all supplies, zero crossing progress, replaces ordinary Help effect. | No roll. |
| Drifting | Fight boat: rush | 4 crossing progress and all supplies. | 1 crossing progress, 1 danger, supplies spill. |
| Spilled | Help boat: salvage | Guaranteed some supplies, zero crossing progress, replaces ordinary Help effect. | No roll. |
| Spilled | Investigate reeds: recover | 2 crossing progress and all supplies. | 1 crossing progress, 1 danger, still spilled. |

All supplies: +3 initial chapel progress. Some: +1. Lost: +2 initial chapel danger. These apply once, in addition to existing chapter carryover. No earned XP, keepsake, Thread, or contribution is removed.

All humans resolve against the choosing turn's initial cargo state. Aggregate afterward: all saved takes precedence over partial salvage, which takes precedence over a spill. A teammate's same-turn success therefore rescues a failed rush. A spill does not enable an unadvertised same-turn recovery. Shared state changes record a separate confirmed consequence; a failed roll remains a failed roll.

Unresolved cargo is lost after resolving round 3 or an early crossing. An empty parked table does not advance the deadline. Companions cannot save cargo. Any hero, including a downed hero, can secure/salvage it. Committed departing heroes still contribute; arrival, rejoin, reload, and command retries cannot restore lost cargo or apply carryover twice.

Special moves have their own fixed effect and reject approach/combination additions. Ordinary reeds setup and combinations remain; boat payoff becomes available after cargo settles. A supported signed Spotlight rescue can save unresolved cargo while retaining its ordinary reviewed rescue effect. Other Spotlight effects cannot silently save cargo.

## Design and motivation worksheet

Adapted from the Game Design Fundamentals GDD and motivation worksheet for one chapter. Intended experiences: cooperative prioritization, discovery, and responsibility. Primary audiences: explorers and socializers; secondary: achievement through chapter completion; no competitive ranking.

Core loop: read threat/cargo → choose safe work, risky progress, or another priority → release → see the recorded consequence → reconsider the next move. Session loop: arrive at the chapel with an understandable consequence of the crossing. Return hypothesis: try another plan with another party; existing keepsakes preserve the memory.

Autonomy comes from guaranteed versus risky commitments. Competence means anticipating the deadline and adapting after a spill. Relatedness means a teammate's safe action can preserve a risky plan. These are hypotheses, not measured outcomes. Balance concern: guaranteed cargo may become a routine opening; observe whether incoming damage, remaining progress, and multiplayer coordination actually change its timing.

## Art, feedback, and persistence

Reuse all backgrounds and raster cutouts; native crate markers communicate cargo state without changing hit areas. Normal release controls remain mandatory, with tap/keyboard alternatives. Guaranteed moves show Commit now and no timing bonus or fabricated die. Confirmed cargo consequence playback precedes automatic history; reduced motion and reconnect show the complete recorded state.

Room and event optional JSON fields use the existing authoritative snapshot/receipt transaction. No SQL migration. Matching is pinned to adventure version; deploy service/client together when hosted rollout is authorized.

## Verification

Local verification on 2026-10-02, working tree based on `ae09237`:

- `rtk vitest run`: 490 unit/service tests passed. The 19 river tests cover transitions, safe/downed Help, scaled payouts, same-turn rescue, arrival order, deadline, empty parking, departure/rejoin, JSON/retries, carryover, Spotlight rescue, old versions, and staged consequences.
- `npm run build`: TypeScript and production bundle passed. The river tests/build were repeated after final copy/layout refinements.
- `node scripts/playtest-scene.mjs --base-url http://127.0.0.1:5201`: 97 checks passed against the real isolated local handler, including a complete adventure, two/four-player participation, signed authored Spotlight, lost-response exact retry/reload, and phone/landscape layouts. Later synthetic presentation checks are labeled separately in that runner.
- `node scripts/playtest-living-table.mjs --base-url http://127.0.0.1:5201`: 25 checks passed, including guaranteed cargo saving followed by both river combination payoffs, all three chapters' combinations, interaction alternatives and reduced motion. Its animation fixtures are labeled separately.
- `node scripts/playtest-river.mjs http://127.0.0.1:5201`: 26 focused browser checks cover safe rescue, failed rush, recovery, partial salvage, last-chance loss, and reload. These use the real reducer with controlled state/roll inputs; they are not independent hosted multiplayer evidence. Preview geometry covers 390×844, 320×568, 1280×800 and enlarged stakes text. Phone pieces remain clear of the hero row, and consequences appear before automatic history. Representative screenshots were visually reviewed.

Local generated reports/screenshots are under `output/playwright/`: `river-results.json`, `scene-integration-results.json`, `living-table-results.json`, and `river-*.png`. Browser suites recorded no page errors or external service calls. Hosted API/Realtime, production deployment, physical phones, screen readers and live model interpretation were not exercised by this pass.

Human check still required: can a newcomer explain the safe/risky tradeoff, spot the changed recovery choice, identify what another player saved, and decide to continue after a clean stopping point? Compare the same chapter with v2, both solo and two players. No enjoyment or retention improvement is inferred from automated checks.
