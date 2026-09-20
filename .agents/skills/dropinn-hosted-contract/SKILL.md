---
name: dropinn-hosted-contract
description: Develop and verify DropInn's Supabase persistence and Netlify command-service contract. Use for persisted-field changes, anonymous hero ownership, migrations, command receipts and rewards, or hosted configuration failures; select database, API, and browser checks separately.
---

# DropInn hosted contract

Work from the repository root. Read `CLAUDE.md` and `server/DROPINN.md`; for a schema change also inspect the affected migrations and row conversions. Use [contract-map.md](references/contract-map.md) to trace a change and [verification.md](references/verification.md) to choose evidence.

- Identify the failing boundary before editing: browser state, auth/ownership, server validation, SQL transaction, runtime, or transport. Preserve specific backend errors. A generic retry or local fallback cannot repair missing hosted schema.
- Keep authority on the server. Browser identity/cosmetics/stats are not trusted substitutes for loading the owned hero. Identity-only saves must not overwrite concurrently earned XP/inventory.
- For a schema change, complete the migration, serialization, server admission, compatibility handling, and focused tests together. Assess deployment order against old rows and the live client/server contract.
- Reuse `scripts/test-database.mjs` and `scripts/smoke-hosted.mjs`; do not recreate their transaction tests in ad hoc SQL. Inspect a script before executing it. The database script needs a fresh disposable container; the smoke script writes hosted data.
- Existing task authorization governs execution. Read-only review does not authorize deployment, live migrations, or hosted account creation. Do all local preparation first; ask only for any remaining external action actually outside the user's authorization. Do not request approval again when the target and action are already authorized.
- Report checks by layer, with actual target/revision and limits. A passing local repository or mocked hosted test does not establish deployed Supabase behavior. Use `dropinn-playtest` for browser transport/recovery.

If access/configuration is missing, name that specific blocker. Do not introduce an MCP integration or change credentials unless needed and authorized for the task.
