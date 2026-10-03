import { describe, expect, it } from 'vitest';
import { createCharacterProfile, type CharacterClassKey } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { buildGemwardRound } from './gemwardRound';
import { getStoryTableState } from './storyTable';
import type { AdventureCommand, AdventureRoom, PlayerAction } from './types';

let sequence = 0;
const hero = (name: string, classKey: CharacterClassKey = 'fighter') => ({ ...createCharacterProfile(name, classKey), id: name });
const cmd = (room: AdventureRoom, type: AdventureCommand['type'], extra: Partial<AdventureCommand> = {}, userId = 'alice', now = room.updatedAt + 1) => reduceAdventure(room, { id: `gemward-round-${++sequence}`, type, userId, ...extra }, now);
const act = (room: AdventureRoom, action: PlayerAction, userId = 'alice') => cmd(room, 'act', { action, expectedTurn: room.turn }, userId);
const next = (room: AdventureRoom) => cmd(room, 'tick', {}, 'alice', room.revealUntil!);
const quiet: PlayerAction = { token: 'fight', targetId: 'display-case' };
const pricing: PlayerAction = { token: 'influence', targetId: 'iris', expedition: { locationId: 'shop', interactionId: 'iris:pricing' } };
const news: PlayerAction = { ...pricing, expedition: { locationId: 'shop', interactionId: 'iris:news' } };
const oren: PlayerAction = { token: 'assist', targetId: 'oren', expedition: { locationId: 'tavern' } };
function pair(classKey: CharacterClassKey = 'fighter', version = 3) {
  let room = createAdventure(hero('Alice', classKey), 'alice', 1000, 'ROUND3', 'gemward', version);
  room = cmd(room, 'join', { character: hero('Bob') }, 'bob');
  return next(act(room, quiet));
}
function battle(classKey: CharacterClassKey = 'fighter', version = 3) {
  const room = pair(classKey, version);
  room.chapter = 1; room.progress = 0;
  Object.assign(room.expedition!, { currentNodeId: 'road', locationId: 'road', routeId: 'road', battle: { id: 'round-forecast', status: 'active', round: 1, progress: 0, goal: 6, stance: 'strike', returnLocationId: 'road' } });
  room.enemyIntent = { sourceId: 'encounter', targetActorId: 'bob', baseDamage: 4, turn: room.turn };
  return room;
}

describe('Gemward shared round guidance', () => {
  it('shows only accepted human moves with current topic and location, never the local draft', () => {
    const initial = pair();
    expect(buildGemwardRound(initial, 'alice', oren).intents).toEqual([]);
    const room = act(initial, news, 'bob');
    const before = JSON.stringify(room);
    const view = buildGemwardRound(room, 'alice', oren);
    expect(view.intents).toMatchObject([{ actorId: 'bob', actorName: 'Bob', label: 'Ask what happened tonight', locationId: 'shop', kind: 'exploration', cue: 'Accepted · settles at round end' }]);
    expect(view.intents[0].detail).toContain('watcher');
    expect(view.waitingFor).toEqual(['Alice']);
    expect(view.notices[0].text).toContain('another part of the plan');
    expect(JSON.stringify(room)).toBe(before);
  });
  it('preserves own accepted intention and departing commitments while excluding pending arrivals and companions', () => {
    let room = act(pair(), oren);
    room = cmd(room, 'leave');
    room.pendingJoins.push('waiting-guest');
    room.commits[room.seats.find(seat => seat.kind === 'companion')!.actorId] = news;
    expect(buildGemwardRound(room, 'alice').intents).toMatchObject([{ actorId: 'alice', label: expect.any(String), locationId: 'tavern' }]);
    expect(buildGemwardRound(room, 'alice').waitingFor).toEqual(['Bob']);
  });
  it('never includes creative free text, signatures or fabricated guaranteed success in the shared plan', () => {
    const room = pair();
    room.commits.bob = { token: 'spotlight', targetId: 'iris', proposal: { id: 'private-signature', turn: room.turn, targetId: 'iris', effect: 'reveal', label: 'PRIVATE LABEL', description: 'PRIVATE DESCRIPTION', idea: 'PRIVATE IDEA', supported: true, source: 'authored' } };
    const view = buildGemwardRound(room, 'alice');
    expect(view.intents[0]).toMatchObject({ label: 'Spotlight at Iris the jeweller', kind: 'spotlight', cue: 'Accepted · outcome pending' });
    expect(JSON.stringify(view)).not.toMatch(/PRIVATE|private-signature|proposal/);
  });
  it('compares preparations across different targets and preserves first personal gifts', () => {
    let room = act(pair(), oren, 'bob');
    expect(buildGemwardRound(room, 'alice', oren).notices[0].text).toContain('Your first personal gift is still available');
    room = pair(); room.chapter = 2; room.expedition!.currentNodeId = 'beacon'; room.expedition!.locationId = 'beacon'; room.expedition!.finaleChoice = 'restore';
    room = act(room, { token: 'assist', targetId: 'cradle' }, 'bob');
    const view = buildGemwardRound(room, 'alice', { token: 'fight', targetId: 'beacon' });
    expect(view.notices).toMatchObject([{ id: 'shared-preparation', kind: 'overlap' }]);
    expect(view.notices[0].text).toContain('recorded once');
  });
  it('warns when an accepted departure will close this round while all accepted work still settles', () => {
    let room = pair(); room = next(act(act(room, pricing), quiet, 'bob'));
    room = act(room, getStoryTableState(room).plan.action, 'bob');
    const view = buildGemwardRound(room, 'alice', oren);
    expect(view.notices[0]).toMatchObject({ id: 'closing', kind: 'closing' });
    expect(view.notices[0].text).toContain('Set out together');
    expect(view.notices[0].text).toContain('all accepted actions settle');
    const finished = act(room, oren);
    expect(finished.expedition!.storyTable!.facts.some(fact => fact.id === 'packed-lantern')).toBe(true);
    expect(buildGemwardRound(finished, 'alice').intents).toEqual([]);
  });
  it('calls out an accepted finish and still allows the other player to arrange morning repairs', () => {
    let room = pair(); room.chapter = 2; room.expedition!.currentNodeId = 'beacon'; room.expedition!.locationId = 'beacon'; room.expedition!.finaleChoice = 'restore';
    room.expedition!.questItems.push('recovered-prism');
    room.expedition!.storyTable!.facts = ['light-ready', 'people-ready'].map(id => ({ id: id as 'light-ready' | 'people-ready', turn: room.turn - 1, sourceEventIds: [] }));
    room = act(room, getStoryTableState(room).plan.action, 'bob');
    const repair: PlayerAction = { token: 'investigate', targetId: 'keeper' };
    expect(buildGemwardRound(room, 'alice', repair).notices[0].text).toContain('Finish together');
    expect(buildGemwardRound(room, 'alice', repair).blockingReason).toBeUndefined();
    room = act(room, repair);
    expect(room.expedition!.storyTable!.facts.some(fact => fact.id === 'repair-plan')).toBe(true);
    expect(room.status).toBe('completed');
  });
  it('warns before a conflicting Spark dust attachment and does not claim a known fact is new', () => {
    let room = pair();
    room.expedition!.stashes.alice = [{ id: 'dust-a', kind: 'dust' }]; room.expedition!.stashes.bob = [{ id: 'dust-b', kind: 'dust' }];
    room = act(room, { ...quiet, expedition: { consumableId: 'dust-b' } }, 'bob');
    const selectedDust = { ...oren, expedition: { ...oren.expedition, consumableId: 'dust-a' } };
    const view = buildGemwardRound(room, 'alice', selectedDust);
    expect(view.notices[0].id).toBe('dust');
    expect(view.blockingReason).toBe(view.notices[0].text);
    expect(() => act(room, selectedDust)).toThrow('already attached');
    expect(buildGemwardRound(room, 'alice', { ...selectedDust, token: 'spotlight' }).blockingReason).toBe(view.blockingReason);
    expect(buildGemwardRound(room, 'alice', oren).blockingReason).toBeUndefined();
    room = pair(); room = next(act(act(room, pricing), quiet, 'bob')); room = act(room, oren, 'bob');
    expect(buildGemwardRound(room, 'alice', pricing).notices.some(note => note.id === 'different-preparation')).toBe(false);
  });
  it('keeps older versions, reveal, travel and completed rooms outside the new guidance', () => {
    for (const version of [1, 2]) expect(buildGemwardRound(pair('fighter', version), 'alice', pricing)).toEqual({ intents: [], waitingFor: [], notices: [] });
    for (const phase of ['reveal', 'travel'] as const) { const room = pair(); room.phase = phase; room.commits.bob = news; expect(buildGemwardRound(room, 'alice').intents).toEqual([]); }
    const room = pair(); room.status = 'completed'; expect(buildGemwardRound(room, 'alice').waitingFor).toEqual([]);
  });
});

describe('Gemward actual counter and cover forecasts', () => {
  it('matches every class, stance and token through ordinary/good/missed release boundaries in all pinned versions', () => {
    for (const classKey of ['fighter', 'rogue', 'wizard', 'cleric'] as const) for (const stance of ['strike', 'trick', 'guard'] as const) for (const token of ['fight', 'influence', 'investigate', 'assist'] as const) for (const releaseMs of [undefined, 649, 650, 950, 951]) {
      const source = battle(classKey); source.expedition!.battle!.stance = stance;
      const action: PlayerAction = { token, targetId: 'encounter', ...(releaseMs === undefined ? {} : { releaseMs }) };
      const preview = buildGemwardRound(source, 'alice', action).forecast!;
      for (const version of [1, 2, 3]) {
        let room = battle(classKey, version); room.expedition!.battle!.stance = stance;
        room = act(act(room, action), { token: 'assist', targetId: 'encounter' }, 'bob');
        const result = room.events.filter(event => event.actorId === 'alice' && event.kind === 'action').at(-1)!.result!;
        expect([result.expedition!.battleProgress, result.protection], `${version}/${classKey}/${stance}/${token}/${releaseMs}`).toEqual([preview.progress, preview.protection]);
      }
    }
  });
  it('shows accepted strongest cover and the real remaining progress without inventing extra protection', () => {
    const room = act(battle(), { token: 'assist', targetId: 'encounter' }, 'bob');
    const view = buildGemwardRound(room, 'alice', { token: 'investigate', targetId: 'encounter' });
    expect(view.forecast).toMatchObject({ progress: 1.5, protection: 2, improvedProtection: 3, knownCover: 4, exchange: 'counter' });
    expect(view.notices[0].text).toContain('will not add');
    expect(view.notices[0].text).toContain('still adds 1.5 battle progress');
    expect(view.forecast!.detail).not.toMatch(/takes 0|avoids|safe from/);
  });
  it('keeps item and downed Protect previews consistent with resolved contributions', () => {
    let room = battle('rogue'); room.seats.find(seat => seat.actorId === 'alice')!.hp = 0;
    room.expedition!.stashes.alice = [{ id: 'thread', kind: 'binding' }];
    const action: PlayerAction = { token: 'assist', targetId: 'bob', targetKind: 'hero', releaseMs: 800, expedition: { consumableId: 'thread' } };
    const preview = buildGemwardRound(room, 'alice', action).forecast!;
    expect(preview).toMatchObject({ label: 'Protect', progress: 1, protection: 3 });
    room = act(act(room, action), { token: 'fight', targetId: 'encounter' }, 'bob');
    const result = room.events.filter(event => event.actorId === 'alice' && event.kind === 'action').at(-1)!.result!;
    expect([result.expedition!.battleProgress, result.protection]).toEqual([preview.progress, preview.protection]);
  });
  it('counts guaranteed Smoke but never assumes a committed creative cover attempt will succeed', () => {
    const room = battle();
    room.commits.bob = { token: 'spotlight', targetId: 'encounter', proposal: { id: 'private-signature', turn: room.turn, targetId: 'encounter', effect: 'cover', label: 'Idea', description: 'Private', idea: 'Private', supported: true, source: 'authored' } };
    const action: PlayerAction = { token: 'fight', targetId: 'encounter' };
    expect(buildGemwardRound(room, 'alice', action).forecast!.knownCover).toBe(1);
    room.expedition!.stashes.bob = [{ id: 'smoke', kind: 'smoke' }]; room.commits.bob.expedition = { consumableId: 'smoke' };
    expect(buildGemwardRound(room, 'alice', action).forecast!.knownCover).toBe(3);
  });
  it('distinguishes a second rogue’s actual progress from the single shared next-round opening', () => {
    let room = battle('rogue');
    room.seats.find(seat => seat.actorId === 'bob')!.character = hero('Bob', 'rogue'); room.players.bob.character = hero('Bob', 'rogue');
    const action: PlayerAction = { token: 'assist', targetId: 'encounter' };
    room = act(room, action, 'bob');
    const view = buildGemwardRound(room, 'alice', action);
    expect(view.forecast).toMatchObject({ progress: 1, protection: 0 });
    expect(view.forecast!.summary).toContain('if the battle continues');
    expect(view.notices[0].text).toContain('shared +1 opening happens once');
    room = act(room, action);
    expect(room.flags.filter(flag => flag === `expedition-opening:${room.turn + 1}`)).toHaveLength(1);
  });
  it('retains the same deterministic class contributions in pinned v1, v2 and v3', () => {
    const outcomes = [1, 2, 3].map(version => {
      let room = battle('wizard', version); room.expedition!.battle!.stance = 'strike';
      room = act(act(room, { token: 'investigate', targetId: 'encounter', releaseMs: 800 }), { token: 'assist', targetId: 'encounter' }, 'bob');
      return room.events.filter(event => event.kind === 'action' && event.contribution).slice(-2).map(event => [event.result!.expedition!.battleProgress, event.result!.protection]);
    });
    expect(outcomes).toEqual([[[1.5, 3], [0.5, 4]], [[1.5, 3], [0.5, 4]], [[1.5, 3], [0.5, 4]]]);
  });
});
