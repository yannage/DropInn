# Briar Glen: The Broken Bell — version 2

Status: implemented locally; hosted publication pending · Definition ID: `briar-glen` · Design version: 2

Baseline: [storytelling and pacing](../storytelling-guide.md). This packet records the existing story plus implemented scene combinations, not a new narrative branch system. Version 1 rooms retain version 1 mechanics and authored outcomes.

## Promise

Help a shepherd recover her missing herd and confront a fallen guardian. Warm, handmade fantasy moves from a familiar village into a dangerous crossing and chapel, then returns the bell and captives to the community. Mara and the herd provide continuity across drop-in visits. The apparent want is to recover animals; the deeper need is to understand and repair the valley’s broken protection. A silent bell becomes a familiar sound again.

## Circle

| Beat | Player-caused event or revealed fact | Visible evidence |
| --- | --- | --- |
| You | Meet Mara beside the broken pen | Shepherd, gate and scattered herd |
| Need | The herd is missing and scattering | Empty shelter and hoofprints |
| Go | Secure the pen or uncover the river lead | Developed gate, tracks and Mara |
| Search | Find a way past the shadow pack | Reeds open; boat launches |
| Find | Discover the guardian’s broken purpose | Ferryman and ward-light clues |
| Take | Choose progress or protection with one combination attempt | Explicit linked payoff choices and current threat |
| Return | Repair the ward or clear the captives’ route | Restored stones and escaping animals |
| Change | The valley survives with a different guardian outcome | Recorded chapter ending, ringing bell and keepsake |

## Chapter 1: The missing livestock

Stable ID: `missing-livestock` · Circle: You / Need / Go · Noncombat pressure

Arrival objective: Help Mara and find where the missing animals were taken.

Catch-up: The evening bell rings over empty pens. Mara, the shepherd, is trapped beside a shattered gate while something moves in the reeds.

Pressure: The frightened herd is scattering. Every round without a lead gives the creature more time. Highlight gate as the combination source, while all four targets remain legal navigation. Show four cutouts on the existing village backdrop, two by two on phones. Middle development changes individual objects as their actions succeed; finishing uses the existing progress goal (24) or round cap and preserves all three authored outcomes.

| Target ID / label | Tokens and plausible interactions | Developed image and next use |
| --- | --- | --- |
| mara / Mara the shepherd | influence: Ask what she saw; Help: Help her clear the gate | Mara’s river lead: Mara is safe. Ask what she saw or help her mark a route through the reeds. |
| tracks / Tracks in the mud | investigate: Follow the claw marks; Help: Mark a trail for the party | The silver ward fragment: The tracks led to a silver fragment. Its markings match the old chapel. |
| gate / The broken gate | fight: Lift the timbers; investigate: Examine the ward charms; Help: Brace the broken gate | The sheltered pen: The timbers are braced. Guide animals into shelter or examine the snapped ward charms. |
| herd / The frightened herd | influence: Calm the scattered animals; Help: Guide them to shelter | The gathered herd: The animals are calmer. One has a torn ribbon that could reveal where the others went. |

### On-screen context

The following records the existing runtime context and cues, including developed uses.

```scene-context
{
  "situation": "Mara is trapped by the gate. The missing herd left tracks toward the river.",
  "targets": {
    "mara": {
      "context": "Pinned by a gate, Mara saw the creature and needs a hand.",
      "actionCues": {
        "influence": "Ask what she saw",
        "assist": "Help her clear the gate"
      },
      "development": {
        "context": "Mara is safe. Ask what she saw or help her mark a route through the reeds.",
        "actionCues": {
          "influence": "Ask about the river",
          "investigate": "Follow Mara’s lead",
          "assist": "Help mark the route"
        }
      }
    },
    "tracks": {
      "context": "Hoofprints cross strange claw marks toward the riverside.",
      "actionCues": {
        "investigate": "Follow the claw marks",
        "assist": "Mark a trail for the party"
      },
      "development": {
        "context": "The tracks led to a silver fragment. Its markings match the old chapel.",
        "actionCues": {
          "investigate": "Read the ward markings",
          "influence": "Share the chapel clue",
          "assist": "Mark the way forward"
        }
      }
    },
    "gate": {
      "context": "Lift the timbers, secure a shelter, or search the snapped ward charms.",
      "actionCues": {
        "fight": "Lift the timbers",
        "investigate": "Examine the ward charms",
        "assist": "Brace the broken gate"
      },
      "development": {
        "context": "The timbers are braced. Guide animals into shelter or examine the snapped ward charms.",
        "actionCues": {
          "influence": "Guide animals into the pen",
          "investigate": "Study the snapped charms",
          "assist": "Keep the shelter secure"
        }
      }
    },
    "herd": {
      "context": "Calm the animals before they disappear into the reeds.",
      "actionCues": {
        "influence": "Calm the scattered animals",
        "assist": "Guide them to shelter"
      },
      "development": {
        "context": "The animals are calmer. One has a torn ribbon that could reveal where the others went.",
        "actionCues": {
          "influence": "Keep the herd calm",
          "investigate": "Inspect the torn ribbon",
          "assist": "Guide the gathered animals"
        }
      }
    }
  }
}
```

Combination: Fight or Help at the gate; next-turn Influence at the herd grants +3 extra progress, or Help at Mara reduces danger by an extra 2. See the common eligibility/scaling contract below.

Success: Mara is safe and the herd gathers around her bell. She shows you a hidden river path and gives you the chapel’s broken ward charm.

Mixed: You rescue what you can before the herd scatters. Mara points to the river: the creature wore a broken chapel ward around its neck.

Setback: The herd escapes into the reeds, but Mara reaches shelter. A torn chapel ward in the mud gives you the lead you need: follow the river.

Keepsake: **Mara’s copper bell** under existing reward eligibility. The round-cap route supplies the next indispensable clue even after setbacks; combinations never gate arrival at the next chapter. Existing development flags and ordinary outcomes carry forward unchanged.

## Chapter 2: The riverside hunt

Stable ID: `riverside-hunt` · Circle: Search / Find / Take · Combat with a visible announced threat

Arrival objective: Get the party across and discover what binds the shadow pack.

Catch-up: Beyond the reeds, a shadow pack guards a narrow crossing. A stranded boat and the old ferryman offer another way to the ruined chapel.

Pressure: The pack circles closer. Distracting it or making cover protects the party from its next lunge. Highlight reeds as the combination source, while all four targets remain legal navigation. Show four cutouts on the existing river backdrop, two by two on phones. Middle development changes individual objects as their actions succeed; finishing uses the existing progress goal (26) or round cap and preserves all three authored outcomes.

| Target ID / label | Tokens and plausible interactions | Developed image and next use |
| --- | --- | --- |
| pack / The shadow pack | fight: Confront the pack; influence: Draw its attention; investigate: Study the ward-light; Help: Support the party against the pack | The shadow pack: Drive it back, distract it, or study the ward-light in its eyes. |
| reeds / The tall reeds | investigate: Find a concealed path; Help: Make cover for the crossing | The concealed path: A narrow path hides the party from the pack. Help others through or scout its far end. |
| boat / The stranded boat | fight: Push the keel free; investigate: Find what holds the boat; Help: Work the rope together | The boat at the crossing: The boat is afloat. Guide the crossing or help keep everyone steady. |
| ferryman / The old ferryman | influence: Ask about the guardian; investigate: Learn the chapel’s history; Help: Help prepare the crossing | The ferryman’s warning: He remembers the guardian. Ask how the chapel bell could break its curse. |

### On-screen context

The following records the existing runtime context and cues, including developed uses.

```scene-context
{
  "situation": "The pack guards the crossing. A boat and the ferryman may offer a way through.",
  "targets": {
    "pack": {
      "context": "Drive it back, distract it, or study the ward-light in its eyes.",
      "actionCues": {
        "fight": "Confront the pack",
        "influence": "Draw its attention",
        "investigate": "Study the ward-light",
        "assist": "Support the party against the pack"
      },
      "development": {
        "context": "Drive it back, distract it, or study the ward-light in its eyes.",
        "actionCues": {
          "fight": "Confront the pack",
          "influence": "Draw its attention",
          "investigate": "Study the ward-light",
          "assist": "Support the party against the pack"
        }
      }
    },
    "reeds": {
      "context": "A concealed path could shelter the party from the pack.",
      "actionCues": {
        "investigate": "Find a concealed path",
        "assist": "Make cover for the crossing"
      },
      "development": {
        "context": "A narrow path hides the party from the pack. Help others through or scout its far end.",
        "actionCues": {
          "investigate": "Scout the far end",
          "assist": "Help others through the path"
        }
      }
    },
    "boat": {
      "context": "Free the rope, push off, and bring everyone across together.",
      "actionCues": {
        "fight": "Push the keel free",
        "investigate": "Find what holds the boat",
        "assist": "Work the rope together"
      },
      "development": {
        "context": "The boat is afloat. Guide the crossing or help keep everyone steady.",
        "actionCues": {
          "influence": "Guide the party aboard",
          "investigate": "Plan a steady crossing",
          "assist": "Keep everyone steady"
        }
      }
    },
    "ferryman": {
      "context": "He remembers when the chapel guardian protected this river.",
      "actionCues": {
        "influence": "Ask about the guardian",
        "investigate": "Learn the chapel’s history",
        "assist": "Help prepare the crossing"
      },
      "development": {
        "context": "He remembers the guardian. Ask how the chapel bell could break its curse.",
        "actionCues": {
          "influence": "Ask about the bell",
          "investigate": "Connect the warning to the curse",
          "assist": "Help follow his directions"
        }
      }
    }
  }
}
```

Combination: Investigate or Help at the reeds; next-turn Fight at the pack grants +3 extra progress, or Help at the boat grants 3 party cover. See the common eligibility/scaling contract below.

Success: The pack falls back as you cross together. The ferryman reveals the truth: Gloamfang is the chapel’s guardian, corrupted by its shattered ward.

Mixed: You reach the far bank with the pack close behind. The ferryman calls after you: restore the chapel bell, and the guardian may remember its purpose.

Setback: A desperate crossing costs you supplies, but gets everyone to the chapel. A ward-mark on the boat reveals how its fallen guardian can be freed.

Keepsake: **A silver river reed** under existing reward eligibility. The round-cap route supplies the next indispensable clue even after setbacks; combinations never gate arrival at the next chapter. Existing development flags and ordinary outcomes carry forward unchanged.

## Chapter 3: The chapel

Stable ID: `the-chapel` · Circle: Take / Return / Change · Combat with a visible announced threat

Arrival objective: Free the captives and restore the ward—or drive Gloamfang away.

Catch-up: Gloamfang coils beneath a silent bell. Livestock huddle behind the altar, and three broken ward stones pulse with the same darkness as the guardian’s eyes.

Pressure: Gloamfang gathers shadow for a sweeping strike. Cover and distractions blunt the attack; repairing the ward weakens the curse. Highlight bell as the combination source, while all four targets remain legal navigation. Show four cutouts on the existing chapel backdrop, two by two on phones. Middle development changes individual objects as their actions succeed; finishing uses the existing progress goal (30) or round cap and preserves all three authored outcomes.

| Target ID / label | Tokens and plausible interactions | Developed image and next use |
| --- | --- | --- |
| gloamfang / Gloamfang | fight: Confront the guardian; influence: Appeal to its old purpose; investigate: Study the curse; Help: Support the party against Gloamfang | Gloamfang: Hold off the corrupted guardian or appeal to the protector it once was. |
| ward / The broken ward | influence: Call to the guardian; investigate: Match the broken stones; Help: Help restore the ward | The restored ward: The stones are joined. Sustain their light or call the guardian back to its purpose. |
| bell / The chapel bell | fight: Pull the bell rope; investigate: Find the right note; Help: Help sound the bell | The ringing chapel bell: The bell is sounding. Keep its rhythm steady or use it to guide the captives. |
| captives / The hidden captives | influence: Guide the frightened animals; Help: Clear their escape route | The open escape route: The first animals are outside. Guide the rest or keep their escape route clear. |

### On-screen context

The following records the existing runtime context and cues, including developed uses.

```scene-context
{
  "situation": "The captives huddle behind the altar. The broken ward binds Gloamfang to its curse.",
  "targets": {
    "gloamfang": {
      "context": "Hold off the corrupted guardian or appeal to the protector it once was.",
      "actionCues": {
        "fight": "Confront the guardian",
        "influence": "Appeal to its old purpose",
        "investigate": "Study the curse",
        "assist": "Support the party against Gloamfang"
      },
      "development": {
        "context": "Hold off the corrupted guardian or appeal to the protector it once was.",
        "actionCues": {
          "fight": "Confront the guardian",
          "influence": "Appeal to its old purpose",
          "investigate": "Study the curse",
          "assist": "Support the party against Gloamfang"
        }
      }
    },
    "ward": {
      "context": "Piece together the stones to unravel the guardian’s curse.",
      "actionCues": {
        "influence": "Call to the guardian",
        "investigate": "Match the broken stones",
        "assist": "Help restore the ward"
      },
      "development": {
        "context": "The stones are joined. Sustain their light or call the guardian back to its purpose.",
        "actionCues": {
          "influence": "Call the guardian back",
          "assist": "Sustain the ward’s light"
        }
      }
    },
    "bell": {
      "context": "Its rope hangs within reach. The right note could interrupt the shadows.",
      "actionCues": {
        "fight": "Pull the bell rope",
        "investigate": "Find the right note",
        "assist": "Help sound the bell"
      },
      "development": {
        "context": "The bell is sounding. Keep its rhythm steady or use it to guide the captives.",
        "actionCues": {
          "influence": "Call the captives toward the sound",
          "investigate": "Follow the bell’s rhythm",
          "assist": "Keep the bell ringing"
        }
      }
    },
    "captives": {
      "context": "Guide the animals out while the guardian’s attention is elsewhere.",
      "actionCues": {
        "influence": "Guide the frightened animals",
        "assist": "Clear their escape route"
      },
      "development": {
        "context": "The first animals are outside. Guide the rest or keep their escape route clear.",
        "actionCues": {
          "influence": "Guide the remaining animals",
          "investigate": "Check the escape route",
          "assist": "Keep the escape route clear"
        }
      }
    }
  }
}
```

Combination: Fight or Help at the bell; next-turn Help at the ward grants +3 extra progress, or Help at the captives grants 3 party cover. See the common eligibility/scaling contract below.

Success: The bell rings over Briar Glen again. The captives return home, and your choices decide whether the guardian stays to protect the valley.

Mixed: The captives escape while the chapel shudders. Gloamfang retreats into the hills, leaving Briar Glen safe for now and the ward waiting to be rebuilt.

Setback: You lead the evacuation before the chapel falls. The villagers survive and light a new beacon together; Gloamfang remains a story for another night.

Keepsake: **The guardian’s moonstone** under existing reward eligibility. The round-cap route supplies the next indispensable clue even after setbacks; combinations never gate arrival at the next chapter. Existing development flags and ordinary outcomes carry forward unchanged.

## Cost and branch contract

Every opening offers extra objective progress or reduced danger/strongest party cover. Ordinary roll risk remains, and one accepted attempt is spent even on a miss. No shared-resource vote or new narrative branch is added. Source setup must succeed; each chapter opens once for the following two choosing turns. Payoffs are explicit, never automatic. Resolve ordinary actions and scaling using existing seat order, so network arrival order cannot enable same-round payoff. Misses, no input and expired windows fall back to ordinary play without an added penalty.

Solo players can prepare and use their own opening. Late humans may use the remaining window; departures/rejoining cannot restore spent uses. Companions never set up or consume combinations. Downed players retain legal Help. Duplicate commands keep existing receipts and cannot consume twice.

## Mechanics and scope

Use existing 60-second choosing, immediate all-committed resolution, release timing, approaches, progress/danger scaling and ten-second reveal. Add optional combination definitions, selections, room windows/uses and structured results in existing JSON. Successful extras are human-scaled and clamped; 3 cover takes the maximum existing value rather than stacking. Setup actor credit adds no XP. Definitions are pinned: new tables select version 2, old version 1 rooms remain unchanged. See [implementation contract](../game-feel-direction.md).

## Closing image and keepsake

The exact success/mixed/setback closing copy appears above. Existing outcomes determine whether the valley is restored, temporarily safe, or evacuated; this pass adds no additional guardian vote. Keep developed artwork accurate rather than resetting objects. Truthful recap examples include “Prepared the gate opening” or “Gather into shelter, prepared by Mara’s helper”; display only recorded names, rolls and actual effects. Reward the chapter keepsake through standard participation rules, with no combination bonus XP. Some guardian danger remains unresolved on mixed/setback outcomes.

## Art and audio brief

Reuse village, river and chapel backgrounds; all twelve existing targets and developed variants; hero layers and enemy poses. Preserve full hero canvas alignment, tint masks and saved catalog IDs. Stage links, token flights, recoil, speech marks and clue sparks are native effects. Ordinary, combination and chapter feedback have increasing weight with quiet gaps. Sound is opt-in, remembered and reduced beneath the single narrator. Reduced motion shows complete outcomes immediately. No new bitmap generation is required.

## Verification

Automated unit/service tests cover every payoff, unsuccessful attempts, expiry, human scaling, strongest cover, reversed arrivals, duplicate commands, late joins, departures/rejoining and pinned versions. Local browser runs use the real isolated handler for solo and two-player turns, each chapter, explicit opposite payoff choices, reload persistence, release controls and lost-response retries. Inspect 320×568, 390×844 and desktop alongside keyboard/tap controls, enlarged text and reduced motion.

Human review remains outstanding: can a newcomer identify Mara’s predicament, explain a move and its visible consequence, discover the next-turn opening, and explain choosing safety versus progress? Compare baseline/revised sessions, record fast/slow/failure paths and whether players want another turn. Separately listen to the mix and test real-device performance. Local implementation and automated behavior are evidence; enjoyment and hosted publication are not yet established.
