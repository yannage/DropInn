// Opt-in integration check. Creates two disposable anonymous heroes and its own
// adventure, then leaves both seats. It never joins another player's table.
// node scripts/smoke-hosted.mjs https://dropp-in.netlify.app [--full]
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'vite';

const site = new URL(process.argv[2] || 'https://dropp-in.netlify.app');
const full = process.argv.includes('--full');
const runtime = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const actors = [];
let room;
const started = Date.now();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  assert.ok(response.ok, `Could not fetch ${new URL(url).pathname}: ${response.status}`);
  return response.text();
}
async function call(actor, operation, extra = {}) {
  const { data } = await actor.client.auth.getSession();
  const response = await fetch(new URL('/api/dropinn', site), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ operation, characterId: actor.hero.id, ...extra }), signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  assert.equal(response.status, 200, `${operation}: ${body.error || response.status}`);
  return body;
}
async function advance() {
  // Each real client sends reads for presence. Exercise both visitors, and
  // tolerate clock skew instead of assuming one wall-clock wait advances.
  for (let attempt = 0; attempt < 12; attempt++) {
    if (room.status === 'completed') return;
    await pause(Math.min(6500, Math.max(300, (room.revealUntil ?? Date.now()) - Date.now() + 300)));
    const snapshots = await Promise.all(actors.map(actor => call(actor, 'read', { roomCode: room.code })));
    room = snapshots.map(result => result.room).sort((a, b) => b.revision - a.revision)[0];
    if (room.phase === 'choosing' || room.status === 'completed') return;
  }
  throw new Error('The shared reveal did not advance');
}
try {
  const html = await read(site);
  const assets = [...html.matchAll(/src="([^"]+\.js)"/g)].map(match => new URL(match[1], site));
  const source = (await Promise.all(assets.map(read))).join('\n');
  const url = process.env.VITE_SUPABASE_URL || source.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
  const key = process.env.VITE_SUPABASE_ANON_KEY || source.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
  assert.ok(url && key, 'Public Supabase configuration missing. Supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY if this deployment uses legacy keys.');
  const { createCharacterProfile } = await runtime.ssrLoadModule('/src/lib/character.ts');
  const { getScene } = await runtime.ssrLoadModule('/src/lib/dropinn/scene.ts');
  for (const name of ['QA visitor A', 'QA visitor B']) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInAnonymously();
    assert.ifError(error);
    const hero = createCharacterProfile(name, 'wizard');
    const actor = { client, hero, userId: data.user.id };
    actors.push(actor);
    const { error: saveError } = await client.from('characters').insert({ id: hero.id, user_id: actor.userId, name,
      class_key: hero.classKey, level: hero.level, xp: hero.xp, hp: hero.hp, max_hp: hero.maxHp,
      traits: hero.traits, spotlight_tokens: hero.spotlightTokens, inventory: hero.inventory, accent: hero.accent });
    assert.ifError(saveError);
  }
  await call(actors[0], 'list');
  const prepared = await call(actors[0], 'prepare');
  room = (await call(actors[0], 'play', { variationId: prepared.variationId })).room;
  assert.equal(Object.keys(room.players).length, 1, 'QA requires an isolated table');
  room = (await call(actors[1], 'join', { roomCode: room.code })).room;
  assert.ok(room.pendingJoins.includes(actors[1].userId));
  room = (await call(actors[0], 'command', { roomCode: room.code, command: { id: randomUUID(), type: 'act', expectedTurn: room.turn, action: { token: 'assist', targetId: 'mara' } } })).room;
  await advance();
  assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 2);
  let rounds = 0;
  do {
    assert.ok(Date.now() - started < 360000, 'Smoke check exceeded six minutes');
    assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 2, 'Both visitors should remain active');
    const scene = getScene(room);
    // These investigations remain available before and after scene upgrades,
    // so this check also works while an older deployment is still live.
    const target = scene.targets.find(target => target.id === ['tracks', 'reeds', 'gloamfang'][room.chapter]);
    assert.ok(target?.tokens.includes('investigate'));
    const commands = actors.map(() => ({ id: randomUUID(), type: 'act', expectedTurn: room.turn, expectedRevision: room.revision, action: { token: 'investigate', targetId: target.id } }));
    await Promise.all(actors.map((actor, index) => call(actor, 'command', { roomCode: room.code, command: commands[index] })));
    room = (await call(actors[0], 'read', { roomCode: room.code })).room;
    assert.equal(room.phase, 'reveal');
    const before = room.players[actors[0].userId];
    const duplicate = (await call(actors[0], 'command', { roomCode: room.code, command: commands[0] })).room;
    assert.equal(duplicate.players[actors[0].userId].xp, before.xp);
    assert.equal(duplicate.players[actors[0].userId].actions, before.actions);
    rounds++;
    console.log(`Shared round ${rounds} passed; chapter ${room.chapter + 1}.`);
    if (rounds === 1) {
      const visitor = actors[1];
      const contribution = room.players[visitor.userId].actions;
      room = (await call(visitor, 'command', { roomCode: room.code, command: { id: randomUUID(), type: 'leave' } })).room;
      assert.equal(room.players[visitor.userId].seatId, null);
      room = (await call(visitor, 'join', { roomCode: room.code })).room;
      assert.ok(room.pendingJoins.includes(visitor.userId));
      assert.equal(room.players[visitor.userId].actions, contribution);
    }
    await advance();
    if (room.status !== 'completed') assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 2);
  } while (full && room.status !== 'completed');
  if (full) assert.equal(room.outcomes.length, 3);
  room = (await call(actors[1], 'command', { roomCode: room.code, command: { id: randomUUID(), type: 'leave' } })).room;
  if (room.status !== 'completed') {
    room = (await call(actors[1], 'join', { roomCode: room.code })).room;
    assert.ok(room.pendingJoins.includes(actors[1].userId) || room.players[actors[1].userId].seatId);
  }
  for (const actor of actors) {
    const history = await call(actor, 'history');
    const recap = history.recaps.find(recap => recap.code === room.code);
    assert.equal(recap.xp, room.players[actor.userId].xp);
    const { data, error } = await actor.client.from('characters').select('xp,inventory').eq('id', actor.hero.id).single();
    assert.ifError(error);
    assert.equal(data.xp, actor.hero.xp + recap.xp);
    for (const keepsake of recap.keepsakes) assert.ok(data.inventory.includes(keepsake));
  }
  console.log(`PASS: admission, concurrent turns, retry, leave/rejoin, refreshed rewards${full ? ', three chapter endings' : ''}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Hosted check failed');
  process.exitCode = 1;
} finally {
  for (const actor of actors) {
    if (room) {
      try { await call(actor, 'command', { roomCode: room.code, command: { id: randomUUID(), type: 'leave' } }); }
      catch { console.error('QA seat cleanup failed; inactivity will release it.'); }
    } else {
      await actor.client.from('characters').delete().eq('id', actor.hero.id);
    }
    await actor.client.auth.signOut();
  }
  await runtime.close();
}
