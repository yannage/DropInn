import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile, type CharacterClassKey } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { createAvalonEpisode } from './avalonContent';
import { questChallengePreview, questContent, questHash, questOptions } from './questRun';
import type { AdventureCommand, AdventureRoom } from './types';
import type { QuestAction, QuestOption } from './questRunTypes';

let sequence = 0;
const hero = (name: string, classKey: CharacterClassKey = 'fighter') => ({ ...createCharacterProfile(name, classKey), id: name });
const command = (room: AdventureRoom, type: AdventureCommand['type'], fields: Partial<AdventureCommand> = {}, actorId = room.questRun!.focus?.actorId ?? 'alice', now = room.updatedAt + 1) => reduceAdventure(room, { id: `dice-${++sequence}`, type, userId: actorId, ...fields }, now);
const act = (room: AdventureRoom, questAction: QuestAction) => command(room, 'quest-act', { expectedTurn: room.turn, questAction });
const next = (room: AdventureRoom) => command(room, 'tick', {}, 'alice', room.revealUntil!);
const turn = (room: AdventureRoom, questAction: QuestAction) => next(act(room, questAction));
function initial(seed: string, classKey: CharacterClassKey = 'fighter', version = 2) {
  const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seed as ReturnType<typeof crypto.randomUUID>);
  try { return createAdventure(hero('Alice', classKey), 'alice', 1000, 'DICE', 'avalon', version); } finally { random.mockRestore(); }
}
function localChallenge(room: AdventureRoom) {
  for (const target of questContent(room).nodes.find(node => node.id === room.questRun!.nodeId)!.targets) {
    const option = questOptions(room, target.id).find(option => option.challenge && (option.supplyDelta ?? 0) > 0);
    if (option) return { target, option };
  }
  throw new Error('Expected an immediately playable inn challenge.');
}
const die = (room: AdventureRoom, option: QuestOption, turn = room.turn, actor = 'alice') => 1 + questHash(`${room.questRun!.seed}:${turn}:${actor}:challenge:${option.challenge!.id}`) % 6;
function fixture(predicate: (room: AdventureRoom, option: QuestOption) => boolean = () => true) {
  for (let index = 0; index < 1000; index++) {
    const seed = `challenge-seed-${index}`;
    if (createAvalonEpisode(seed).manifest.startNodeId !== 'larch-inn') continue;
    const room = initial(seed), { option, target } = localChallenge(room);
    if (predicate(room, option)) return { room, option, target };
  }
  throw new Error('No authored challenge fixture met the requested outcome.');
}

describe('Avalon v2 class checks and shared attempts', () => {
  it('pins new checks to v2 while v1 keeps its existing content and manifest', () => {
    const { room } = fixture();
    expect(room.adventureVersion).toBe(2); expect(room.questRun!.avalon!.manifest.contentVersion).toBe(2);
    expect(room.questRun!.avalon!.manifest.generatorVersion).toBe(1);
    const old = initial(room.id, 'fighter', 1);
    expect(old.questRun!.avalon!.manifest.contentVersion).toBe(1); expect(old.questRun!.challenges).toBeUndefined();
    expect(questContent(old).nodes.flatMap(node => node.targets.flatMap(target => target.options)).some(option => option.challenge)).toBe(false);
    expect(room.questRun!.avalon!.manifest.cast).toEqual(old.questRun!.avalon!.manifest.cast);
    expect(room.questRun!.nodeId).toBe(old.questRun!.nodeId);
    old.questRun!.avalon!.manifest.contentVersion = 2;
    expect(() => command(old, 'tick')).toThrow('saved episode');
  });
  it('previews exact six-sided odds from class attributes and upgrades without revealing the die', () => {
    let { room, option } = fixture();
    const first = questChallengePreview(room, 'alice', option)!;
    expect(first.sides).toBe(6); expect(first.total).toBe(6); expect(first.helpModifier).toBe(0);
    expect(first.baseModifier).toBe(room.questRun!.heroes.alice.attributes[option.challenge!.attribute]);
    expect(first.successes).toBe([1, 2, 3, 4, 5, 6].filter(roll => roll + first.modifier >= first.dc).length);
    expect(first.chance).toBe(first.successes / 6); expect(first).not.toHaveProperty('roll'); expect(first).not.toHaveProperty('success');
    const attributes = (['fighter', 'rogue', 'wizard', 'cleric'] as const).map(classKey => questChallengePreview(initial(room.id, classKey), 'alice', option)!.baseModifier);
    expect(new Set(attributes).size).toBeGreaterThan(1);
    room.questRun!.heroes.alice.points = 1;
    room = act(room, { kind: 'upgrade', attribute: option.challenge!.attribute });
    expect(questChallengePreview(room, 'alice', option)!.baseModifier).toBe(first.baseModifier + 1);
  });
  it('records a named partial attempt without its success effects, and allows only one failure reward', () => {
    let { room, option, target } = fixture((room, option) => {
      const preview = questChallengePreview(room, 'alice', option)!;
      return die(room, option) + preview.modifier < preview.dc && die(room, option, room.turn + 1) + preview.modifier + 1 < preview.dc;
    });
    const before = structuredClone(room.questRun!);
    room = act(room, { kind: 'interact', targetId: target.id, optionId: option.id });
    const source = room.events.find(event => event.quest?.check?.challengeId === option.challenge!.id)!;
    expect(source.quest!.check).toMatchObject({ success: false, sides: 6, attribute: option.challenge!.attribute, helpModifier: 0, attempt: 1 });
    expect(source.text).toContain('Alice can retry with +1'); expect(source.text).toContain('No supplies spent; safe choices remain');
    expect(room.questRun!.items).toEqual(before.items); expect(room.questRun!.facts).toEqual(before.facts); expect(room.questRun!.supplies).toBe(before.supplies);
    expect(room.questRun!.usedOptions).not.toContain(option.id); expect(room.players.alice.xp).toBe(3);
    expect(room.questRun!.challenges![option.challenge!.id].contributors).toEqual([{ actorId: 'alice', actorName: 'Alice', sourceEventId: source.id }]);
    room = next(room); const learned = questChallengePreview(room, 'alice', option)!;
    expect(learned.helpKind).toBe('learned'); expect(learned.helpModifier).toBe(1); expect(learned.helpSourceEventId).toBe(source.id);
    room = act(room, { kind: 'interact', targetId: target.id, optionId: option.id });
    expect(room.events.at(-1)!.quest!.check!.success).toBe(false); expect(room.players.alice.xp).toBe(3);
    expect(room.questRun!.challenges![option.challenge!.id].attempts).toBe(2);
    expect(room.questRun!.challenges![option.challenge!.id].contributors).toHaveLength(1);
    expect(room.events.at(-1)!.contribution).toBe(false); expect(room.events.at(-1)!.result!.changed).toBe(true);
    expect(room.questRun!.avalon!.director.meaningful).toBe(true);
  });
  it('lets a different human use saved setup for +2, never stacking companions or another copy of a setup', () => {
    let { room, option, target } = fixture((room, option) => die(room, option) + questChallengePreview(room, 'alice', option)!.modifier < option.challenge!.dc);
    room = command(room, 'join', { character: hero('Bob', 'wizard') }, 'bob');
    room = turn(room, { kind: 'interact', targetId: target.id, optionId: option.id });
    const effort = structuredClone(room.questRun!.challenges![option.challenge!.id]);
    room = turn(room, { kind: 'pass' }); expect(room.questRun!.focus!.actorId).toBe('bob');
    const preview = questChallengePreview(room, 'bob', option)!;
    expect(preview).toMatchObject({ helpKind: 'party', helpModifier: 2, helperActorId: 'alice', helperName: 'Alice', helpSourceEventId: effort.contributors[0].sourceEventId });
    expect(questChallengePreview(room, 'alice', option)!.helpModifier).toBe(0); // Same hero, two humans: ask your teammate.
    room = command(room, 'leave', {}, 'alice');
    expect(questChallengePreview(room, 'bob', option)!.helpModifier).toBe(2); // Completed setup survives departure.
    room = act(room, { kind: 'interact', targetId: target.id, optionId: option.id });
    const check = room.events.filter(event => event.quest?.check).at(-1)!.quest!.check!;
    expect(check.helpModifier).toBe(2); expect(check.modifier).toBe(check.baseModifier! + 2); expect(check.helperName).toBe('Alice');
    expect(check.helpSourceEventId).toBe(effort.contributors[0].sourceEventId);
  });
  it('applies success once, closes alternative methods, and never lets an accepted command reroll', () => {
    let { room, option, target } = fixture((room, option) => die(room, option) + questChallengePreview(room, 'alice', option)!.modifier >= option.challenge!.dc);
    const payload: AdventureCommand = { id: 'frozen-die', type: 'quest-act', userId: 'alice', expectedTurn: room.turn, questAction: { kind: 'interact', targetId: target.id, optionId: option.id } };
    room = reduceAdventure(room, payload, room.updatedAt + 1);
    const source = room.events.find(event => event.quest?.check?.challengeId === option.challenge!.id)!;
    expect(source.quest!.check!.success).toBe(true); expect(room.questRun!.usedOptions).toContain(option.id);
    expect(room.questRun!.challenges![option.challenge!.id].completedEventId).toBe(source.id);
    for (const id of option.discover ?? []) expect(room.questRun!.facts.some(fact => fact.id === id)).toBe(true);
    expect(reduceAdventure(JSON.parse(JSON.stringify(room)), payload, room.updatedAt + 1)).toEqual(room);
    const frozenCheck = structuredClone(source.quest!.check);
    room.questRun!.heroes.alice.points = 1;
    room = act(room, { kind: 'upgrade', attribute: option.challenge!.attribute });
    expect(reduceAdventure(room, payload, room.updatedAt + 1)).toBe(room);
    expect(room.events.find(event => event.id === source.id)!.quest!.check).toEqual(frozenCheck);
    expect(() => reduceAdventure(room, { ...payload, id: 'new-id-same-turn' }, room.updatedAt + 1)).toThrow('ended');
    room = next(room);
    expect(questOptions(room, target.id).some(candidate => candidate.challenge?.id === option.challenge!.id)).toBe(false);
    expect(() => act(room, payload.questAction!)).toThrow('displayed intention');
  });
  it('preserves unfinished checks through travel, parking and a new hero without granting AFK setup', () => {
    let { room, option, target } = fixture((room, option) => die(room, option) + questChallengePreview(room, 'alice', option)!.modifier < option.challenge!.dc);
    const idle = command(room, 'tick', {}, 'alice', room.deadline);
    expect(idle.questRun!.challenges).toEqual({});
    room = turn(room, { kind: 'interact', targetId: target.id, optionId: option.id });
    const effort = structuredClone(room.questRun!.challenges);
    const edge = questContent(room).edges.find(edge => edge.from === room.questRun!.nodeId)!;
    room = turn(room, { kind: 'travel', edgeId: edge.id });
    room = command(room, 'leave', {}, 'alice'); expect(room.status).toBe('parked');
    room = command(JSON.parse(JSON.stringify(room)), 'join', { character: hero('Bob', 'cleric') }, 'bob');
    expect(room.questRun!.challenges).toEqual(effort);
    const returnEdge = questContent(room).edges.find(path => path.from === edge.to && path.to === edge.from)!;
    room = turn(room, { kind: 'travel', edgeId: returnEdge.id });
    expect(questChallengePreview(room, 'bob', option)!.helpModifier).toBe(2);
  });
  it('rejects client-provided outcomes without spending a focus action', () => {
    const { room, option, target } = fixture(), before = structuredClone(room);
    expect(() => act(room, { kind: 'interact', targetId: target.id, optionId: option.id, roll: 6, success: true } as never)).toThrow('valid quest action');
    expect(room).toEqual(before);
  });
  it('rejects malformed persisted attempts instead of losing setup or manufacturing help', () => {
    let { room, option, target } = fixture((room, option) => die(room, option) + questChallengePreview(room, 'alice', option)!.modifier < option.challenge!.dc);
    room = act(room, { kind: 'interact', targetId: target.id, optionId: option.id });
    expect(() => command(JSON.parse(JSON.stringify(room)), 'tick')).not.toThrow();
    for (const damage of [
      (value: AdventureRoom) => { value.questRun!.challenges = undefined; },
      (value: AdventureRoom) => { value.questRun!.challenges = {}; },
      (value: AdventureRoom) => { value.questRun!.challenges![option.challenge!.id].attempts++; },
      (value: AdventureRoom) => { value.questRun!.challenges![option.challenge!.id].contributors[0].sourceEventId = 'invented-help'; },
      (value: AdventureRoom) => { value.questRun!.challenges![option.challenge!.id].completedEventId = value.events.at(-1)!.id; },
      (value: AdventureRoom) => { value.questRun!.challenges![option.challenge!.id].nodeId = 'not-in-avalon'; },
    ]) {
      const invalid = structuredClone(room); damage(invalid);
      expect(() => command(invalid, 'tick')).toThrow('valid saved challenge attempts');
    }
  });
});
