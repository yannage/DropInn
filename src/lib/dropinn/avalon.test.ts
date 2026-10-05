import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { avalonContent, createAvalonEpisode, AVALON_THREADS } from './avalonContent';
import { questContent, questMap, questOptions } from './questRun';
import type { AvalonConflictId } from './avalonTypes';
import type { QuestAction, QuestOption } from './questRunTypes';
import type { AdventureCommand, AdventureRoom } from './types';

let sequence = 0;
const hero = (name: string) => ({ ...createCharacterProfile(name, 'fighter'), id: name });
function initial(seed = 'avalon-rules-0') {
  const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seed as ReturnType<typeof crypto.randomUUID>);
  try { return createAdventure(hero('Alice'), 'alice', 1000, 'AVALON', 'avalon'); } finally { random.mockRestore(); }
}
const command = (room: AdventureRoom, type: AdventureCommand['type'], userId = 'alice', fields: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) => reduceAdventure(room, { id: `avalon-${++sequence}`, type, userId, ...fields }, now);
const action = (room: AdventureRoom, questAction: QuestAction, userId = room.questRun!.focus!.actorId) => command(room, 'quest-act', userId, { expectedTurn: room.turn, questAction });
const next = (room: AdventureRoom) => room.status === 'completed' ? room : command(room, 'tick', 'alice', {}, room.revealUntil!);
const turn = (room: AdventureRoom, questAction: QuestAction) => next(action(room, questAction));
function travel(room: AdventureRoom, destination: string): AdventureRoom {
  if (room.questRun!.nodeId === destination) return room;
  const edges = questContent(room).edges;
  const queue = [{ node: room.questRun!.nodeId, path: [] as string[] }], seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!; if (seen.has(current.node)) continue; seen.add(current.node);
    if (current.node === destination) {
      for (const edgeId of current.path) room = turn(room, { kind: 'travel', edgeId });
      return room;
    }
    for (const edge of edges.filter(edge => edge.from === current.node && (edge.requires ?? []).every(id => room.questRun!.facts.some(fact => fact.id === id)) && !(edge.absent ?? []).some(id => room.questRun!.facts.some(fact => fact.id === id)))) queue.push({ node: edge.to, path: [...current.path, edge.id] });
  }
  throw new Error(`No path to ${destination}`);
}
function optionAt(room: AdventureRoom, predicate: (option: QuestOption) => boolean) {
  for (const node of questContent(room).nodes) for (const target of node.targets) for (const option of target.options) {
    if (predicate(option) && !room.questRun!.usedOptions.includes(option.id) && (option.requires ?? []).every(id => room.questRun!.facts.some(fact => fact.id === id)) && !(option.absent ?? []).some(id => room.questRun!.facts.some(fact => fact.id === id))) return { node, target, option };
  }
  throw new Error('Expected an eligible authored option.');
}
function choose(room: AdventureRoom, predicate: (option: QuestOption) => boolean) {
  const selection = optionAt(room, predicate); room = travel(room, selection.node.id);
  return turn(room, { kind: 'interact', targetId: selection.target.id, optionId: selection.option.id });
}
function discover(room: AdventureRoom, threadId = room.questRun!.avalon!.threads[0].id) {
  return choose(room, option => option.avalon?.discoverThread === threadId);
}
function followed() {
  let room = initial(); const threadId = room.questRun!.avalon!.threads[0].id;
  room = discover(room, threadId); room = turn(room, { kind: 'follow-thread', threadId });
  return { room, threadId };
}

describe('Avalon saved world and seeded episodes', () => {
  it('retains one six-place atlas while varying starts, cast, weather and two of three conflicts', () => {
    const starts = new Set<string>(), casts = new Set<string>(), pairs = new Set<string>(), weather = new Set<string>();
    const geography = avalonContent(createAvalonEpisode('atlas-0')).nodes.map(node => node.id).sort();
    for (let i = 0; i < 80; i++) {
      const seed = `atlas-${i}`, episode = createAvalonEpisode(seed), content = avalonContent(episode);
      expect(createAvalonEpisode(seed)).toEqual(episode);
      expect(avalonContent(JSON.parse(JSON.stringify(episode)))).toEqual(content);
      expect(content.nodes.map(node => node.id).sort()).toEqual(geography);
      expect(episode.manifest.conflictIds).toHaveLength(2); expect(new Set(episode.manifest.conflictIds).size).toBe(2);
      expect(content.nodes).toHaveLength(6); expect(content.nodes.some(node => node.id === episode.manifest.startNodeId)).toBe(true);
      starts.add(episode.manifest.startNodeId); casts.add(JSON.stringify(episode.manifest.cast)); pairs.add([...episode.manifest.conflictIds].sort().join(',')); weather.add(episode.manifest.weather);
    }
    expect(starts.size).toBe(3); expect(pairs.size).toBe(3); expect(casts.size).toBeGreaterThan(3); expect(weather.size).toBe(3);
  });
  it('pins Avalon independently and leaves Mosswater and old Gemward definitions unchanged', () => {
    const room = initial(); expect(room.adventureId).toBe('avalon'); expect(room.adventureVersion).toBe(1); expect(room.questRun!.avalon!.manifest.seed).toBe(room.id);
    expect(createAdventure(hero('Moss'), 'm', 1000, 'MOSS', 'mosswater').questRun!.avalon).toBeUndefined();
    for (const version of [1, 2, 3]) expect(createAdventure(hero('Gem'), 'g', 1000, 'GEM', 'gemward', version).questRun).toBeUndefined();
    const future = structuredClone(room); future.questRun!.avalon!.manifest.contentVersion = 2 as 1;
    expect(() => command(future, 'tick')).toThrow(/version|unavailable/i);
  });
  it('introduces leads through confirmed choices and requires an explicit follow before resolution', () => {
    let room = initial(); const threadId = room.questRun!.avalon!.threads[0].id;
    expect(() => action(room, { kind: 'follow-thread', threadId })).toThrow('discovered lead');
    room = discover(room, threadId);
    expect(room.questRun!.avalon!.threads.find(thread => thread.id === threadId)!.status).toBe('discovered');
    expect(room.questRun!.avalon!.director.opportunities).toContain(threadId);
    for (const target of questContent(room).nodes.find(node => node.id === room.questRun!.nodeId)!.targets) expect(questOptions(room, target.id).some(option => option.avalon?.resolveThread === threadId)).toBe(false);
    const before = room.questRun!.focus!.remaining; room = action(room, { kind: 'follow-thread', threadId });
    expect(room.questRun!.focus!.remaining).toBe(before - 1);
    expect(room.questRun!.avalon!.threads.find(thread => thread.id === threadId)!.status).toBe('active');
    expect(room.events.at(-1)!.quest?.threadId).toBe(threadId);
    room = next(room); expect(() => action(room, { kind: 'follow-thread', threadId })).toThrow('discovered lead');
  });
  it('keeps accepted follow receipts and their fact provenance across reload and reconnect', () => {
    let room = initial(); const threadId = room.questRun!.avalon!.threads[0].id; room = discover(room, threadId);
    const payload: AdventureCommand = { id: 'avalon-exact-follow', type: 'quest-act', userId: 'alice', expectedTurn: room.turn, questAction: { kind: 'follow-thread', threadId } };
    room = reduceAdventure(room, payload, room.updatedAt + 1); const accepted = structuredClone(room);
    expect(reduceAdventure(JSON.parse(JSON.stringify(room)), payload, room.updatedAt + 1)).toEqual(accepted);
    const manifest = structuredClone(room.questRun!.avalon!.manifest), facts = structuredClone(room.questRun!.facts);
    room = command(room, 'leave'); expect(room.status).toBe('parked');
    const parked = room; expect(command(room, 'tick', 'alice', {}, room.updatedAt + 100000)).toBe(parked);
    room = command(JSON.parse(JSON.stringify(room)), 'join', 'alice', { character: hero('Alice') });
    expect(room.questRun!.avalon!.manifest).toEqual(manifest); expect(room.questRun!.facts).toEqual(facts);
    expect(room.questRun!.facts.find(fact => fact.id === `following:${threadId}`)!.sourceEventId).toBeTruthy();
  });
  it('rejects changed resolved cast assignments without rewriting the saved manifest', () => {
    const room = initial(), before = structuredClone(room.questRun!.avalon!.manifest);
    room.questRun!.avalon!.manifest.cast.host.nodeId = 'green-quarry';
    expect(() => command(room, 'tick')).toThrow('saved episode');
    expect(room.questRun!.avalon!.manifest.cast.host.nodeId).toBe('green-quarry');
    expect(before.cast.host.nodeId).toBe('larch-inn');
    const reordered = initial();
    reordered.questRun!.avalon!.manifest = Object.fromEntries(Object.entries(reordered.questRun!.avalon!.manifest).reverse()) as typeof before;
    expect(() => command(reordered, 'tick')).not.toThrow(); // JSONB object order is irrelevant.
  });
});

describe('Avalon resolutions, promises and deliberate return', () => {
  it.each([0, 5, 6].flatMap(start => ['inn-pack', 'bank-gather-reeds'].map(optionId => ({ start, optionId }))))('reports actual supplies from $optionId with $start already packed', ({ start, optionId }) => {
    let room = initial(); const selection = optionAt(room, option => option.id === optionId);
    room = travel(room, selection.node.id); room.questRun!.supplies = start;
    const payload: AdventureCommand = { id: `supply-cap-${start}-${optionId}`, type: 'quest-act', userId: room.questRun!.focus!.actorId, expectedTurn: room.turn, questAction: { kind: 'interact', targetId: selection.target.id, optionId } };
    room = reduceAdventure(room, payload, room.updatedAt + 1);
    const granted = Math.min(2, 6 - start), excess = 2 - granted;
    const source = room.events.find(event => event.quest?.optionId === optionId)!;
    expect(room.questRun!.supplies).toBe(start + granted); expect(source.quest!.supplyDelta).toBe(granted);
    expect(source.text).toContain(granted ? `The party gains ${granted} shared ${granted === 1 ? 'supply' : 'supplies'}.` : 'The shared pack is full; 2 supplies are left behind.');
    expect(source.text.match(/The party gains/g)?.length ?? 0).toBe(granted ? 1 : 0);
    if (excess) expect(source.text).toContain(`${excess} ${granted ? 'extra ' : ''}${excess === 1 ? 'supply is' : 'supplies are'} left behind`);
    else expect(source.text).not.toContain('left behind');
    expect(source.change!.text).toBe(source.text.slice(source.text.indexOf(': ') + 2));
    expect(room.questRun!.usedOptions).toContain(optionId);
    if (optionId === 'bank-gather-reeds') { expect(room.questRun!.items).toContain('reed-bundle'); expect(source.quest!.itemIds).toContain('reed-bundle'); }
    expect(reduceAdventure(JSON.parse(JSON.stringify(room)), payload, room.updatedAt + 1)).toEqual(room);
    room = next(room); expect(() => action(room, { kind: 'interact', targetId: selection.target.id, optionId })).toThrow('displayed intention');
  });
  const variants = (Object.keys(AVALON_THREADS) as AvalonConflictId[]).flatMap(threadId => Object.keys(AVALON_THREADS[threadId].resolutions).map(resolutionId => ({ threadId, resolutionId })));
  it.each(variants)('carries out $threadId / $resolutionId and returns once with its chosen cost', ({ threadId, resolutionId }) => {
    const seed = Array.from({ length: 30 }, (_, index) => `resolution-${index}`).find(seed => createAvalonEpisode(seed).manifest.conflictIds.includes(threadId))!;
    let room = initial(seed);
    // Prepare through actual shared resources before committing to a thread.
    room = choose(room, option => option.id === 'inn-tools');
    room = choose(room, option => option.id === 'inn-pack');
    room = choose(room, option => option.id === 'bank-gather-reeds');
    room = discover(room, threadId); room = turn(room, { kind: 'follow-thread', threadId });
    const inspectId = threadId === 'bitter-water' ? resolutionId === 'bargain' ? 'water-listen' : 'water-inspect-vat' : threadId === 'missing-carter' ? 'carter-check' : 'herd-survey';
    room = choose(room, option => option.id === inspectId);
    if (resolutionId === 'haul' || resolutionId === 'fight') {
      room = choose(room, option => option.id === (threadId === 'bitter-water' ? 'water-fight' : 'herd-fight'));
      const cycle = room.questRun!.avalon!.director.cycle;
      let strikes = 0;
      while (room.questRun!.combat?.status === 'active' && strikes++ < 30) {
        const accepted = action(room, { kind: 'combat', move: 'attack' });
        expect(accepted.questRun!.avalon!.director.cycle).toBe(cycle);
        room = next(accepted);
      }
      expect(strikes).toBeLessThan(30);
      expect(room.questRun!.facts.some(fact => fact.id.startsWith('encounter-cleared:'))).toBe(true);
    }
    const selection = optionAt(room, option => option.avalon?.resolveThread === threadId && option.avalon.resolutionId === resolutionId);
    room = travel(room, selection.node.id);
    const remainingBefore = room.questRun!.supplies;
    room = action(room, { kind: 'interact', targetId: selection.target.id, optionId: selection.option.id });
    expect(room.status).toBe('active'); expect(room.questRun!.ending).toBeUndefined();
    expect(room.questRun!.supplies).toBe(remainingBefore + (selection.option.supplyDelta ?? 0));
    expect(room.questRun!.avalon!.threads.find(thread => thread.id === threadId)).toMatchObject({ status: 'resolved', resolutionId });
    expect(room.questRun!.facts.some(fact => fact.id === `resolved:${threadId}`)).toBe(true);
    room = next(room);
    for (const node of questContent(room).nodes) for (const target of node.targets) expect(questOptions({ ...room, questRun: { ...room.questRun!, nodeId: node.id } }, target.id).some(option => option.avalon?.resolveThread === threadId)).toBe(false);
    if (resolutionId === 'bargain') {
      expect(room.questRun!.avalon!.promise?.status).toBe('owed'); expect(room.questRun!.items).toContain('reed-bundle');
      room = choose(room, option => option.id === 'inn-deliver-reeds');
      expect(room.questRun!.avalon!.promise?.status).toBe('kept'); expect(room.questRun!.items).not.toContain('reed-bundle');
      expect(room.events.find(event => event.quest?.optionId === 'inn-deliver-reeds')!.quest!.spentItemIds).toEqual(['reed-bundle']);
    }
    room = travel(room, 'larch-inn');
    const payload: AdventureCommand = { id: `return-${threadId}-${resolutionId}`, type: 'quest-act', userId: room.questRun!.focus!.actorId, expectedTurn: room.turn, questAction: { kind: 'return-episode' } };
    room = reduceAdventure(room, payload, room.updatedAt + 1);
    expect(room.status).toBe('completed'); expect(room.questRun!.ending!.id).toBe('return');
    expect(room.questRun!.ending!.text).toContain(AVALON_THREADS[threadId].resolutions[resolutionId].change);
    expect(room.questRun!.ending!.text).toContain('Still open'); expect(room.outcomes).toHaveLength(3); expect(room.players.alice.keepsakes).toHaveLength(3);
    expect(reduceAdventure(JSON.parse(JSON.stringify(room)), payload, room.updatedAt + 1)).toEqual(room);
  });
  it('cannot return without a changed thread, or from a remote place', () => {
    let room = initial(); room = travel(room, 'larch-inn');
    expect(() => action(room, { kind: 'return-episode' })).toThrow('Resolve a thread');
    room = travel(room, 'old-ford'); expect(() => action(room, { kind: 'return-episode' })).toThrow('return to Larch Inn');
  });
});

describe('Avalon party-cycle director', () => {
  it('starts a fresh human cycle when someone else resumes an empty table', () => {
    let { room } = followed(); const manifest = structuredClone(room.questRun!.avalon!.manifest);
    room = command(room, 'leave'); const cycle = room.questRun!.avalon!.director.cycle;
    room = command(JSON.parse(JSON.stringify(room)), 'join', 'bob', { character: hero('Bob') });
    expect(room.questRun!.avalon!.director.participants).toEqual(['bob']);
    expect(room.questRun!.avalon!.director.cycle).toBe(cycle);
    expect(room.questRun!.avalon!.manifest).toEqual(manifest);
    room.questRun!.visitedNodeIds = [room.questRun!.nodeId];
    room = turn(room, { kind: 'travel', edgeId: questMap(room).edges.find(edge => edge.available)!.id });
    room = turn(room, { kind: 'pass' });
    expect(room.questRun!.avalon!.director.cycle).toBe(cycle + 1);
  });
  it('records a truthful unmet request at zero supplies and caps pressure without closing routes', () => {
    let { room, threadId } = followed();
    if (room.questRun!.focus!.remaining === 1) room = turn(room, { kind: 'pass' });
    room.questRun!.avalon!.threads.find(thread => thread.id === threadId)!.pressure = 2;
    room.questRun!.supplies = 0; room.questRun!.visitedNodeIds = [room.questRun!.nodeId];
    room = turn(room, { kind: 'travel', edgeId: questMap(room).edges.find(edge => edge.available)!.id });
    room = turn(room, { kind: 'pass' });
    const thread = room.questRun!.avalon!.threads.find(thread => thread.id === threadId)!;
    expect(thread.pressure).toBe(3); expect(thread.pressureSupplySpent).toBe(false); expect(room.questRun!.supplies).toBe(0);
    const pressure = room.events.filter(event => event.quest?.kind === 'director').at(-1)!;
    expect(pressure.text).toContain('no aid or reward is claimed'); expect(pressure.quest!.supplyDelta).toBe(0);
    expect(questMap(room).edges.some(edge => edge.available)).toBe(true);
    const count = room.events.filter(event => event.quest?.kind === 'director').length;
    room.questRun!.visitedNodeIds = [room.questRun!.nodeId];
    room = turn(room, { kind: 'travel', edgeId: questMap(room).edges.find(edge => edge.available)!.id }); room = turn(room, { kind: 'pass' });
    expect(room.events.filter(event => event.quest?.kind === 'director')).toHaveLength(count);
  });
  it('counts one signal per person per thread, and never infers interest from a pass', () => {
    let room = initial(); const threadId = room.questRun!.avalon!.threads[0].id;
    room = discover(room, threadId);
    // Start a fresh focus with the established lead, then follow it as its first action.
    if (room.questRun!.focus!.remaining === 1) room = turn(room, { kind: 'pass' });
    room = action(room, { kind: 'follow-thread', threadId });
    expect(room.questRun!.avalon!.director.interest.alice?.[threadId]).toBe(1);
    const state = JSON.parse(JSON.stringify(room.questRun!.avalon!.manifest));
    room = next(room); room = turn(room, { kind: 'pass' });
    expect(room.questRun!.avalon!.manifest).toEqual(state);
    const cycle = room.questRun!.avalon!.director.cycle, pressure = room.questRun!.avalon!.threads.map(thread => thread.pressure);
    for (let i = 0; i < 4; i++) room = turn(room, { kind: 'pass' });
    expect(room.questRun!.avalon!.director.cycle).toBe(cycle); expect(room.questRun!.avalon!.threads.map(thread => thread.pressure)).toEqual(pressure);
  });
  it('never pressures an idle-only table, and parks it without discoveries or preference votes', () => {
    let { room } = followed();
    // Clear the already accepted focus before measuring idle-only time.
    if (room.questRun!.focus!.remaining === 1) room = turn(room, { kind: 'pass' });
    const before = structuredClone(room.questRun!.avalon!);
    room = next(command(room, 'tick', 'alice', {}, room.deadline));
    room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(room.status).toBe('parked'); expect(room.questRun!.avalon!.threads).toEqual(before.threads);
    expect(room.questRun!.avalon!.director.cycle).toBe(before.director.cycle);
    expect(Object.keys(room.questRun!.avalon!.director.interest)).toHaveLength(0);
  });
  it('preserves two different leads and the seeded truth when the party chooses different interests', () => {
    let room = initial(); const [first, second] = room.questRun!.avalon!.threads.map(thread => thread.id);
    room = discover(room, first); room = turn(room, { kind: 'follow-thread', threadId: first });
    room = discover(room, second); room = turn(room, { kind: 'follow-thread', threadId: second });
    expect(room.questRun!.avalon!.threads.filter(thread => thread.status === 'active')).toHaveLength(2);
    expect(new Set(room.questRun!.avalon!.director.opportunities)).toEqual(new Set([first, second]));
    expect(room.questRun!.avalon!.manifest).toEqual(createAvalonEpisode(room.id).manifest);
    expect(() => action(room, { kind: 'follow-thread', threadId: 'invented-thread' })).toThrow('discovered lead');
  });
});
