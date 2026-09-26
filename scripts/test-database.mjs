// Run against a disposable Postgres container, never a hosted project.
import { execFileSync, execFile } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { checkAccountDatabase } from './check-account-database.mjs';
import { checkCollectionDatabase } from './check-collection-database.mjs';
const container = process.argv[2] || 'dropinn-db-qa';
if (!/^dropinn-[a-z0-9-]+$/.test(container)) throw new Error('Use a dedicated dropinn-* QA container.');
const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
const sql = text => execFileSync('docker', args, { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
CREATE PUBLICATION supabase_realtime;`);
for (const file of readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()) {
  sql(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  console.log(`Applied ${file}`);
}
// Applying the v2 migration again must also be safe.
sql(readFileSync('supabase/migrations/202609190001_dropinn_v2.sql', 'utf8'));
sql(readFileSync('supabase/migrations/202609200001_hero_customization.sql', 'utf8'));
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const hero = '33333333-3333-4333-8333-333333333333';
sql(`INSERT INTO auth.users VALUES ('${user}'),('${other}');
INSERT INTO characters(id,user_id,name,class_key,level,xp,hp,max_hp) VALUES ('${hero}','${user}','Wren','wizard',3,240,10,10);`);
sql(readFileSync('supabase/migrations/202609210001_accounts.sql','utf8'));
// Old rows retain NULL cosmetics until edited; rerunning the migration preserves saved parts.
sql(`DO $$ BEGIN
IF EXISTS (SELECT 1 FROM characters WHERE id='${hero}' AND (appearance IS NOT NULL OR equipment IS NOT NULL)) THEN
  RAISE EXCEPTION 'Old hero unexpectedly changed';
END IF;
END $$;
UPDATE characters SET appearance='{"body":"round","eyes":"wide","nose":"none","mouth":"toothy"}'::jsonb,
  equipment='{"hat":null}'::jsonb WHERE id='${hero}';`);
sql(readFileSync('supabase/migrations/202609200001_hero_customization.sql', 'utf8'));
// Service-role RLS bypass is insufficient without a table-level SELECT grant.
sql(`SET ROLE service_role;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id='${hero}' AND user_id='${user}') THEN
  RAISE EXCEPTION 'Server cannot load the owned hero';
END IF;
END $$;
RESET ROLE;`);
const snapshot = {
  version: 2, id: '44444444-4444-4444-8444-444444444444', code: 'QA1234', revision: 0, status: 'active',
  players: { [user]: { userId: user, character: { id: hero }, joinedAt: Date.now(), leftAt: null, xp: 0, keepsakes: [] } }, events: [],
};
function rpc(room, expected, command) {
  return `SELECT dropinn_apply_snapshot('QA1234',${expected},'${command}','${user}',$json$${JSON.stringify(room)}$json$::jsonb);`;
}
if (sql(rpc(snapshot, -1, 'create-qa')) !== 'applied') throw new Error('Creation failed');
snapshot.revision = 1;
snapshot.players[user].xp = 15;
snapshot.players[user].keepsakes = ['Copper bell'];
snapshot.events = [{ id: 'event-1', text: 'Wren rescues Mara.' }];
if (sql(rpc(snapshot, 0, 'award-qa')) !== 'applied') throw new Error('Award failed');
if (sql(rpc(snapshot, 0, 'award-qa')) !== 'duplicate') throw new Error('Duplicate not detected');
if (sql(rpc(snapshot, 0, 'stale-qa')) !== 'conflict') throw new Error('Stale revision not detected');
sql(`DO $$ BEGIN
IF (SELECT xp FROM characters WHERE id='${hero}') <> 255 THEN RAISE EXCEPTION 'Duplicate XP'; END IF;
IF (SELECT count(*) FROM adventure_events) <> 1 THEN RAISE EXCEPTION 'Duplicate event'; END IF;
IF (SELECT cardinality(inventory) FROM characters WHERE id='${hero}') <> 1 THEN RAISE EXCEPTION 'Duplicate keepsake'; END IF;
IF (SELECT appearance->>'body' FROM characters WHERE id='${hero}') <> 'round' THEN RAISE EXCEPTION 'Appearance lost during rewards'; END IF;
IF (SELECT equipment FROM characters WHERE id='${hero}') <> '{"hat":null}'::jsonb THEN RAISE EXCEPTION 'Unequipped hat lost'; END IF;
END $$;`);
// Two real concurrent transactions compete for the same room revision.
const contenders = [20, 25].map((xp, i) => {
  const next = structuredClone(snapshot);
  next.revision = 2;
  next.players[user].xp = xp;
  return new Promise((resolve, reject) => {
    const child = execFile('docker', args, { encoding: 'utf8' }, (error, stdout, stderr) => error ? reject(new Error(stderr)) : resolve(stdout.trim()));
    child.stdin.end(rpc(next, 1, `concurrent-${i}`));
  });
});
const results = await Promise.all(contenders);
if (results.filter(value => value === 'applied').length !== 1 || results.filter(value => value === 'conflict').length !== 1) throw new Error(`Bad CAS: ${results}`);
sql(`DO $$ BEGIN
IF (SELECT xp FROM characters WHERE id='${hero}') <> 240 + (SELECT xp FROM adventure_rewards WHERE user_id='${user}') THEN RAISE EXCEPTION 'Reward/state split'; END IF;
END $$;`);
const memberCount = sql(`SET ROLE authenticated; SET request.jwt.claim.sub='${user}'; SELECT count(*) FROM adventure_rooms;`).split('\n').at(-1);
const strangerCount = sql(`SET ROLE authenticated; SET request.jwt.claim.sub='${other}'; SELECT count(*) FROM adventure_rooms;`).split('\n').at(-1);
if (memberCount !== '1' || strangerCount !== '0') throw new Error(`Membership policy failed: ${memberCount}/${strangerCount}`);
for (const forbidden of ["UPDATE adventure_rooms SET revision=99", rpc(snapshot, 2, 'client-write')]) {
  let denied = false;
  try { sql(`SET ROLE authenticated; SET request.jwt.claim.sub='${user}'; ${forbidden}`); } catch { denied = true; }
  if (!denied) throw new Error('Client write was not denied');
}
console.log('PASS: migrations, repeat migration, rewards/events idempotency, real concurrent CAS, member reads, and client-write denial.');
await checkAccountDatabase({sql,args,user,other,hero});
// Account migration reruns above replace the wrapper; the latest migration restores it.
sql(readFileSync('supabase/migrations/202609250001_collections.sql','utf8'));
sql(readFileSync('supabase/migrations/202609250001_collections.sql','utf8'));
await checkCollectionDatabase({sql,args});
