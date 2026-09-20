---
name: dropinn-playtest
description: Verify DropInn V2 features across two players, timed turns, reconnects, saved heroes, and mobile input. Use after changes to admission, table actions, synchronization, hero saving, or responsive controls; distinguish local browser results from hosted API and Realtime evidence.
---

# DropInn playtest

Work from the DropInn repository root. Read `CLAUDE.md` and the changed code; current code wins over old QA scripts. This skill selects integration scenarios, not a full-suite ritual for every visual edit.

1. Choose the affected scenario in [scenarios.md](references/scenarios.md). Read [session-and-turn-model.md](references/session-and-turn-model.md) when setting up players or investigating timing.
2. Establish the actual backend from an API response. Use the existing dev server when suitable; check its port and whether its cached server handler needs restarting. Restarting clears local rooms. Do not run a hosted smoke script merely to establish a local baseline.
3. Use the installed Playwright skill when operating its CLI, or available browser tools following their own instructions. Node Playwright helpers are in [browser-helpers.mjs](scripts/browser-helpers.mjs); see [usage](references/helpers.md). They do not launch a server, install dependencies, or choose a deployment.
4. Start fresh named QA sessions. Derive accessible locators from the current UI and catalog; ignored `output/playwright` scripts are historical examples, not maintained acceptance tests. Arm network waits before clicking. Synchronize on the matching command response and resulting UI, not arbitrary sleeps or a button merely becoming visible.
5. Assert the requested behavior and the relevant shared state/reward invariant. Capture screenshots for visual claims and response summaries for synchronization claims. Never include bearer tokens, full invitations, or unrelated player data in reports.
6. Record evidence with [evidence.md](references/evidence.md). Name skipped checks and distinguish local, hosted API, hosted browser, and physical-phone results. Preserve useful new scenarios here; put generated reports/screenshots in ignored `output/`.

Run the relevant existing Vitest tests for changed behavior. A browser screenshot is not proof of persistence, and an API polling run is not proof of Realtime. Use `dropinn-hosted-contract` for schema/runtime/deployment failures rather than changing UI waits to conceal them.
