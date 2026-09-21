# The Last Flight of the Teacup

Status: locally verified playable baseline; not published · Definition ID: `last-flight-teacup` · Design version: 1

Playable scope: three chapters, authored outcomes and keepsakes, scene targets, and a server-resolved first-turn finale choice. Ordinary Help and developments carry the signature interactions; the optional extension below remains unimplemented. Proposed state names use the shared `storyBranch` and target flags. The art baseline uses one stage plate per story, neutral prop cutouts, explicit cost variants and a closing object with caption. Additional poses and the broader background/before-and-after wish list remain future art work. See [runtime scope and verification](../playable-adventures.md).

Baseline: [DropInn storytelling and pacing](../storytelling-guide.md).

## Promise

A tiny postal airship slips its moorings with festival guests aboard. Rescue its passengers before it reaches the storm wall.

Tone: buoyant peril and handmade heroics. Captain Pella, a sheep in an oversized aviator hat, believes a good captain brings every delivery home pristine. The party wants to save her ship; the deeper problem is choosing what a rescue is allowed to leave behind. The closing image repeats the departure dock, now holding a battered ship or a sail made into a communal shelter.

## Circle

| Beat | Event | Visible evidence |
| --- | --- | --- |
| You | Pella prepares her beloved ship for the annual lantern delivery. | Neatly wrapped parcels and a polished brass kettle on deck. |
| Need | A snapped mooring lets the occupied ship drift away. | Rope whips free; the gangplank scrapes along the dock. |
| Go | Players secure a boarding line and follow it aboard. | Their repaired line becomes the route into the next scene. |
| Search | They steady passengers and trace the failing lift system. | Steam escapes a seam beneath the proud festival sail. |
| Find | They restart the engine and discover a usable emergency vent. | The kettle glows; the ship briefly rises above the cloud. |
| Take | The vent can power descent only by tearing the sail, or the crew can abandon the ship in its lifeboat. | Both routes show passengers safe, but different losses. |
| Return | The party completes its chosen landing or evacuation. | Lines carry passengers toward the familiar dock. |
| Change | Pella starts an imperfect, shared rescue service. | Patched airship or sail-roofed ferry shelter replaces the display stand. |

## Chapter 1 — Catch the Teacup

ID: `teacup-dock` · Beats: You/Need/Go · Noncombat.

Arrival: **“Catch the airship before the last rope snaps.”** Highlight the mooring. Catch-up: “Pella's ship is drifting with guests aboard. Secure a way onto the deck.”

The ship fills the upper scene; four foreground objects stay reachable. Pressure is the growing gap, represented by danger and rope tension. Developing the mooring makes the path aboard visible; chapter closure always boards the party, with an improvised net on a setback.

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `teacup-mooring` / Last rope | Fight: haul; Investigate: locate sound anchor; Help: brace | Secured boarding line → guide passengers across |
| `teacup-pella` / Captain Pella | Influence: focus her orders; Investigate: ask about controls; Help: untangle coat | Pella standing at rail → coordinate boarding |
| `teacup-parcels` / Sliding parcels | Fight: wedge crates; Investigate: read emergency markings; Help: secure cargo | Tied stack exposes lifeboat diagram → study escape route |
| `teacup-guests` / Festival guests | Influence: calm; Help: catch a slipping guest | Guests holding safety line → organize evacuation |

Success: board with a sound line and intact parcels. Mixed: everyone boards; parcels spill. Setback: the dock net catches the party and is hauled aboard; the original mooring is lost. All routes show the lifeboat diagram and the sail's “emergency vent” patch before chapter 2. Proposed fact: `teacup-line-sound` records the cleaner boarding, not permission to continue.

### On-screen context

Authored presentation; describes opportunities, not new completion requirements.

```scene-context
{
  "situation": "Pella's ship is drifting with guests aboard. Secure a way onto the deck.",
  "targets": {
    "teacup-mooring": {
      "context": "The last mooring is fraying. A secure line could get everyone aboard.",
      "actionCues": {
        "fight": "haul",
        "investigate": "locate sound anchor",
        "assist": "brace"
      },
      "development": {
        "context": "Secured boarding line. Guide passengers across.",
        "actionCues": {
          "investigate": "guide passengers across",
          "assist": "guide passengers across"
        }
      }
    },
    "teacup-pella": {
      "context": "Pella is tangled in her coat as her ship drifts away. Help her direct the rescue.",
      "actionCues": {
        "influence": "focus her orders",
        "investigate": "ask about controls",
        "assist": "untangle coat"
      },
      "development": {
        "context": "Pella standing at rail. Coordinate boarding.",
        "actionCues": {
          "influence": "coordinate boarding",
          "investigate": "coordinate boarding",
          "assist": "coordinate boarding"
        }
      }
    },
    "teacup-parcels": {
      "context": "Parcels slide across the deck. Securing them could uncover emergency instructions.",
      "actionCues": {
        "fight": "wedge crates",
        "investigate": "read emergency markings",
        "assist": "secure cargo"
      },
      "development": {
        "context": "Tied stack exposes lifeboat diagram. Study escape route.",
        "actionCues": {
          "investigate": "study escape route",
          "assist": "study escape route"
        }
      }
    },
    "teacup-guests": {
      "context": "The guests are slipping as the deck tilts. Help them reach a safety line.",
      "actionCues": {
        "influence": "calm",
        "assist": "catch a slipping guest"
      },
      "development": {
        "context": "Guests holding safety line. Organize evacuation.",
        "actionCues": {
          "influence": "organize evacuation",
          "assist": "organize evacuation"
        }
      }
    }
  }
}
```

## Chapter 2 — Above the Cloudline

ID: `teacup-cloudline` · Beats: Search/Find/Take · Combat through a clockwork maintenance gull striking exposed heroes; existing hero intent and Protect apply.

Arrival: **“Steady the deck and restart the kettle engine.”** Highlight the engine. Catch-up: “The guests are aboard, but the ship cannot descend. Its safety gull mistakes the rescue for damage.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `teacup-engine` / Kettle engine | Fight: loosen valve; Investigate: trace steam; Help: repair | Glowing kettle → regulate descent |
| `teacup-sail` / Festival sail | Investigate: find vent seam; Influence: coordinate handlers; Help: tension ropes | Marked vent seam → prepare the descent option |
| `teacup-gull` / Brass gull | Fight: interrupt; Influence: mimic maintenance call; Investigate: identify command; Help: distract | Lowered beak and lit service symbol → keep it occupied |
| `teacup-lifeboat` / Hanging lifeboat | Fight: release winch; Investigate: inspect harnesses; Help: secure guests | Lifeboat level with deck → prepare evacuation |

Success: engine stable and both routes prepared. Mixed: the engine coughs, but both routes remain available. Setback: the engine gives one final burst; Pella points out both escape options directly. All outcomes expose the same cost before a choice is accepted: **“Save the ship; tear the sail”** or **“Save the sail; leave the ship.”** No guest is a hidden price. Proposed facts: `teacup-engine-steady`, `teacup-route`.

### On-screen context

Authored presentation; describes opportunities, not new completion requirements.

```scene-context
{
  "situation": "The guests are aboard, but the ship cannot descend. Its safety gull mistakes the rescue for damage.",
  "targets": {
    "teacup-engine": {
      "context": "The kettle engine has stalled. Restoring its steam could steady the ship.",
      "actionCues": {
        "fight": "loosen valve",
        "investigate": "trace steam",
        "assist": "repair"
      },
      "development": {
        "context": "Glowing kettle. Regulate descent.",
        "actionCues": {
          "investigate": "regulate descent",
          "assist": "regulate descent"
        }
      }
    },
    "teacup-sail": {
      "context": "The festival sail traps the airship above the clouds. Its seams may offer a way down.",
      "actionCues": {
        "investigate": "find vent seam",
        "influence": "coordinate handlers",
        "assist": "tension ropes"
      },
      "development": {
        "context": "Marked vent seam. Prepare the descent option.",
        "actionCues": {
          "investigate": "prepare the descent option",
          "influence": "prepare the descent option",
          "assist": "prepare the descent option"
        }
      }
    },
    "teacup-gull": {
      "context": "The safety gull mistakes your rescue for damage. Interrupt it or find its maintenance command.",
      "actionCues": {
        "fight": "interrupt",
        "influence": "mimic maintenance call",
        "investigate": "identify command",
        "assist": "distract"
      },
      "development": {
        "context": "Lowered beak and lit service symbol. Keep it occupied.",
        "actionCues": {
          "influence": "keep it occupied",
          "investigate": "keep it occupied",
          "assist": "keep it occupied"
        }
      }
    },
    "teacup-lifeboat": {
      "context": "The lifeboat hangs out of reach. Lowering it could prepare an escape.",
      "actionCues": {
        "fight": "release winch",
        "investigate": "inspect harnesses",
        "assist": "secure guests"
      },
      "development": {
        "context": "Lifeboat level with deck. Prepare evacuation.",
        "actionCues": {
          "investigate": "prepare evacuation",
          "assist": "prepare evacuation"
        }
      }
    }
  }
}
```

## Chapter 3 — Something Worth Bringing Home

ID: `teacup-homecoming` · Beats: resolve Take/Return/Change · Noncombat; landing pressure remains visible.

Arrival: **“Bring everyone home using the route you chose.”** Before choosing, highlight the vent and lifeboat; afterward highlight the route's control. Catch-up: “The ship and its treasured sail cannot both survive intact. The prepared route shows how everyone can reach the dock.”

| Target ID / label | Supported interactions | Developed image → next use |
| --- | --- | --- |
| `teacup-return-valve` / Vent handle | Fight: turn; Investigate: match pressure; Help: brace | Released vent and torn sail on ship route → stabilize landing; on evacuation route, idle vent → steady abandoned ship while boarding |
| `teacup-return-boat` / Lifeboat cradle | Fight: winch; Investigate: balance load; Help: transfer guests | Lifeboat occupied on evacuation route, safety platform on ship route → guide final passengers |
| `teacup-return-guests` / Passenger line | Influence: coordinate; Help: support | Guests arriving on dock → clear landing area |
| `teacup-return-beacon` / Home beacon | Investigate: find alignment; Influence: signal dock crew; Help: hold light | Bright approach path → guide final descent |

Use the baseline's proposed one-turn branch resolution; branch-directed Help at vent/lifeboat chooses the route. Ties or no branch input default visibly to lifeboat evacuation, preserving people and the sail. Preview that this safe fallback still loses the airship. In that route, the cradle winch draws the detachable sail down over the lifeboat as a canopy before the empty ship drifts away; it is visibly salvaged, not magically restored in the ending. After selection, neither route target permits switching; both offer route-compatible support. One human can complete either route.

Success: precise arrival; Pella opens a rescue service from the patched ship or salvaged-sail shelter. Mixed: everyone arrives, but scattered parcels become the community's next repair job. Setback: guests land in the dock's soft emergency nets; transport is lost, but neighbors build a temporary shelter together. Branch loss remains true in every ending.

Closing copy: “Pella hangs a new sign: People first. Parcels when possible.” Keepsake: Pella's dented brass badge, under normal contribution eligibility. Recap example, only if supported by events: “You held the boarding line while the guests crossed.”

### On-screen context

Authored presentation; describes opportunities, not new completion requirements.

```scene-context
{
  "situation": "The ship and its treasured sail cannot both survive intact. The prepared route shows how everyone can reach the dock.",
  "targets": {
    "teacup-return-valve": {
      "context": "This vent can bring the ship down, but opening it will tear the treasured sail.",
      "actionCues": {
        "fight": "turn",
        "investigate": "match pressure",
        "assist": "brace"
      },
      "development": {
        "context": "Released vent and torn sail on ship route. Steady abandoned ship while boarding.",
        "actionCues": {
          "investigate": "steady abandoned ship while boarding",
          "assist": "steady abandoned ship while boarding"
        }
      }
    },
    "teacup-return-boat": {
      "context": "The lifeboat can carry everyone and the sail home, leaving the airship behind.",
      "actionCues": {
        "fight": "winch",
        "investigate": "balance load",
        "assist": "transfer guests"
      },
      "development": {
        "context": "Lifeboat occupied on evacuation route, safety platform on ship route. Guide final passengers.",
        "actionCues": {
          "investigate": "guide final passengers",
          "assist": "guide final passengers"
        }
      }
    },
    "teacup-return-guests": {
      "context": "The passengers need a steady route home. Help the line keep moving.",
      "actionCues": {
        "influence": "coordinate",
        "assist": "support"
      },
      "development": {
        "context": "Guests arriving on dock. Clear landing area.",
        "actionCues": {
          "influence": "clear landing area",
          "assist": "clear landing area"
        }
      }
    },
    "teacup-return-beacon": {
      "context": "The dock is difficult to see. A clear beacon could guide the last approach.",
      "actionCues": {
        "investigate": "find alignment",
        "influence": "signal dock crew",
        "assist": "hold light"
      },
      "development": {
        "context": "Bright approach path. Guide final descent.",
        "actionCues": {
          "investigate": "guide final descent",
          "influence": "guide final descent",
          "assist": "guide final descent"
        }
      }
    }
  }
}
```

## Signature mechanic, art and verification

Proposed extension: a secured line sets up a later landing opportunity. Its first later use grants one bounded support benefit; it never gates escape. This requires combo state and order-independent consumption. The playable baseline uses ordinary authored developments without this extra bonus. Branch selection is implemented in the shared reducer.

Art: dock, cloud deck and home approach backgrounds; cutouts for every target/developed state; gull wind-up/reaction; torn/intact sail branches; patched ship and shelter closing images. Four small interaction zones remain stable while sky and vessel change. Use the existing MS Paint art workflow; do not commission all final art before a graybox proves the routes.

Verify that newcomers can explain both losses before choosing; no ending restores the sacrificed ship/sail; round-cap routes reveal the vent without a successful investigation; reversed branch submissions agree; one human and companions can land; a late join sees the chosen route; Protect remains a contribution even when another player completes the engine. Measure whether the brief calm after engine restart makes the cost understandable without delaying the turn clock.
