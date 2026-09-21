# Three-state story scroll

The upper-left Story cylinder replaces the bottom Story drawer button. It unrolls into a floating compact log, expands into a full-height reader, and rolls back up. The compact panel stops above the action dock. Full mode includes the live timer, traps focus and makes the background inert. Escape returns full → compact → collapsed.

The reader uses stored room events and chapter metadata. Event IDs deduplicate delivery; chapter outcomes only fill gaps in older logs. Changes supply a short headline, while the original action, dice, effects and next-step text remain under Details. Optional live narration is labeled temporary. No backend or story definition changes are required.

Reading follows new entries only at the bottom. Otherwise it keeps the reader's place and offers New events. Mode changes retain entry disclosures and the visible-entry anchor. Other gameplay sheets temporarily hide the compact log. The scroll starts collapsed for each adventure; reading preferences are local to the mounted visit, not persisted across browser reloads. Reconnect restores the story through the existing room snapshot.

All three states now reuse the same roller pixels from `public/art/ui-scroll-full.webp`. `ScrollRoller` projects the original image through three SVG viewports: fixed end caps and a flexible middle. No new illustration is drawn and no alternate image is swapped when expanding. The earlier independent rolled/compact images remain as source history but are no longer used by this reader. A solid HTML parchment area between the rollers contains the heading, controls, internally scrolling entries and New events button. This replaces the unsafe percentage insets and stretched whole-frame images that let text spill over the scene. Framer Motion animates dimensions over 350ms without scaling text. Reduced motion removes the transition. Buttons remain at least 44px; text enlargement reflows within the reader.

The correction was visually checked at 1280×1100, 1280×800, 390×844 and 320×568. The focused two-player Teacup run passed, including reconnect, arriving events, focus restoration, reading-position retention and completion. The browser checks now assert that the actual heading, controls and reader fit inside the paper, that text wraps horizontally, and that at least 44px of reading space remains. The previous outer-panel bounds alone did not detect the reported defect. Production build passed.

## Local verification — 2026-09-20

- 202 tests across 18 files passed, including event chronology, duplicate/outcome handling, full mechanical detail preservation and Protect without a fabricated die.
- The art contract passed for all three keyframes, including dimensions, alpha, inventory hashes and runtime files.
- Production TypeScript/Vite build passed. Importing Framer Motion into active play raises the main chunk to approximately 612KB (182KB gzip); Vite reports its 500KB size advisory. This is a performance follow-up, not a build failure.
- Existing `test:scene` passed, including updated full-reader focus/Escape behavior, timed actions, cancellation, response-loss retries and mobile controls.
- `test:adventures` completed all three stories with two isolated browsers and the real local handler. The scroll checks cover 1280×800, 390×844 and 320×568; compact dock clearance; full bounds/inert background/focus; details and reading-position preservation; temporary Party suspension; reduced motion; 200% root text size; and real teammate results arriving while reading earlier history.
- Screenshots inspected: `output/playwright/story-scroll-compact-1280.png`, mobile compact/full examples, and `story-scroll-enlarged-text.png`. Reports remain in the existing local playtest output directory.
- Rapid full/compact/rolled reversals with 30ms gaps retained one panel, removed background inertness correctly and returned focus to Story.

These checks use local browser emulation and an injected server clock. Physical-device text scaling, screen-reader behavior and human pacing feedback remain separate. No deployment occurred.
