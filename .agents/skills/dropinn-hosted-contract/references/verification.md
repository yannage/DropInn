# Verification by layer

## Local code

Choose affected tests in `src/lib/supabase/characters.test.ts`, `src/store/adventureStore.hosted.test.ts`, `server/dropinn.test.ts`, and reducer tests. Run `npm run build` for type/integration changes. Mocked production authentication tests verify code contracts, not deployed grants or credentials.

## Disposable SQL

`node scripts/test-database.mjs <container>` creates auth-role stubs, applies migrations, reruns selected migrations, and exercises real concurrent SQL, receipt/reward atomicity, hero compatibility, and access restrictions. It assumes a fresh database; rerunning against the same initialized database is not a valid reset procedure.

Use an available Docker runtime and an approved Postgres image/version matching the intended target where practical. Create a unique `dropinn-*` container and verify its identity before running the script. Do not point this harness at a hosted project or an existing development database. Record version and container ownership; remove only the QA container you created when finished. A missing Docker runtime is a tool prerequisite, not a test failure. Do not install Docker or pull a new image silently when that exceeds the task scope.

## Hosted API (writes data)

After target authorization and schema preflight:

```text
node scripts/smoke-hosted.mjs https://<explicit-target>
node scripts/smoke-hosted.mjs https://<explicit-target> --full
```

Always supply the target; the script has a production default. The quick mode tests one shared round; `--full` exercises all three chapters. It creates two anonymous users, heroes, and an isolated private table; it leaves seats/signs out but does not fully delete successful-run history/accounts. Do not describe it as read-only or completely self-cleaning. It may request optional configured AI preparation. Do not run it in a retry loop on permission/schema failures; fix the identified cause, then rerun the relevant check.

Confirm migrations before deploying dependent code, including old-row compatibility. A schema/grants inspection can be read-only, but applying SQL is a separate operation. Preserve existing data and follow the authorized deployment/back-up procedure from `server/DROPINN.md`.

## Browser and pilot

Use two authenticated contexts to test Realtime, simultaneous action UI, refresh/rejoin, and network recovery. Follow `dropinn-playtest`. Physical phones and actual friend-group sessions remain separate evidence.

Acceptance for the next schema change: demonstrate actionable preflight failure without the migration in a disposable environment; apply and rerun it; verify old heroes, owned access, concurrent actions, duplicate receipts, and rewards surviving customization. Record revision, target, commands, results, and any residual QA data. This is the real measure of skill usefulness, not frontmatter validation.
