import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure } from './engine';
import { buildStoryTable, storyTableLastTurn } from './storyTablePresentation';
import type { AdventureRoom, StoryEvent } from './types';

const room = () => createAdventure(createCharacterProfile('Moss', 'wizard'), 'moss', 1000, 'READ01', 'gemward', 2);
const event = (data: Partial<StoryEvent>): StoryEvent => ({ id: 'event', at: 2000, turn: 1, chapter: 0, kind: 'action', text: '', ...data });
function discovered(): AdventureRoom {
  const value = room();
  value.expedition!.questItems.push('ledger-copy');
  value.events.push(event({ id: 'moss-copy', actorId: 'moss', actorName: 'Moss', contribution: true, text: 'Moss copied Iris’s delivery mark.', result: { changed: true, expedition: { questItems: ['ledger-copy'] } } }));
  value.events.push(event({ id: 'leaf-copy', actorId: 'leaf', actorName: 'Leaf', contribution: true, text: 'Leaf followed Tess’s delivery chit.', result: { changed: true, expedition: { questItems: ['ledger-copy'] } } }));
  value.events.push(event({ id: 'shared-ledger', kind: 'consequence', text: 'The ledger is in the pouch.', journey: { nodeId: 'town', questChanges: [{ itemId: 'ledger-copy', kind: 'gained', sourceEventIds: ['moss-copy', 'leaf-copy'] }] } }));
  return value;
}

describe('the durable story table', () => {
  it('uses the current situation context without importing an old version’s sacrifice', () => {
    const value = createAdventure(createCharacterProfile('Moss', 'wizard'), 'moss', 1000, 'READ03', 'gemward', 3);
    value.expedition!.variant = 'ward';
    const view = buildStoryTable(value, 'moss', { token: 'investigate', targetId: 'price-board', expedition: { locationId: 'shop' } });
    expect(view.focus?.stake).toContain('what the beacon changes');
    expect(view.focus?.stake).not.toContain('destroy');
  });
  it('recognizes a witnessed road lead without requiring a physical pouch item', () => {
    const value = createAdventure(createCharacterProfile('Moss', 'wizard'), 'moss', 1000, 'READ03', 'gemward', 3);
    value.turn = 2;
    value.expedition!.storyTable!.facts.push({ id: 'road-lead', turn: 1, sourceEventIds: ['heard-news'] });
    const view = buildStoryTable(value, 'moss');
    expect(view.question).toContain('Follow a lead now');
    expect(view.plan?.available).toBe(true);
    expect(value.expedition!.questItems).not.toContain('road-lead');
  });
  it('does not ask players to arrange a repair crew they have already prepared', () => {
    const value = createAdventure(createCharacterProfile('Moss', 'wizard'), 'moss', 1000, 'READ03', 'gemward', 3);
    value.turn = 8; value.chapter = 2;
    value.expedition!.currentNodeId = 'beacon'; value.expedition!.locationId = 'beacon'; value.expedition!.finaleChoice = 'restore';
    value.expedition!.storyTable!.facts = ['light-ready', 'people-ready', 'repair-plan'].map(id => ({ id: id as 'light-ready' | 'people-ready' | 'repair-plan', turn: 7, sourceEventIds: ['preparation'] }));
    expect(buildStoryTable(value, 'moss').question).toBe('The preparations are ready. Finish together when you are ready.');
  });
  it('states a concrete opening problem without revealing the hidden motive', () => {
    const value = room();
    value.expedition!.variant = 'ward';
    const view = buildStoryTable(value, 'moss');
    expect(view.situation).toContain('prism is missing');
    expect(view.question).toContain('where');
    expect(view.situation).not.toMatch(/Nella moved|save its living spark|smuggler/i);
    expect(view.lastTurn).toBeUndefined();
  });
  it('keeps cause and unlocked opportunity after the reveal and across a reload', () => {
    const value = discovered();
    value.phase = 'choosing'; value.turn = 2; value.revealUntil = null;
    const saved = JSON.parse(JSON.stringify(value)) as AdventureRoom;
    const moment = storyTableLastTurn(saved, 'moss');
    expect(moment?.title).toContain('warehouse');
    expect(moment?.text).toContain('opens the warehouse path');
    expect(moment?.actorNames).toEqual(['You', 'Leaf']);
    expect(moment?.detail).toContain('Moss copied Iris’s delivery mark');
    expect(moment?.text).not.toContain('pouch');
  });
  it('does not manufacture a change from an unconfirmed prepared or committed action', () => {
    const value = room();
    const action = { token: 'investigate' as const, targetId: 'iris', expedition: { locationId: 'shop', interactionId: 'iris:investigate' } };
    value.commits.moss = action;
    const original = JSON.stringify(value);
    expect(buildStoryTable(value, 'moss', action).lastTurn).toBeUndefined();
    expect(JSON.stringify(value)).toBe(original);
  });
  it('explains a taken route using acquisition sources without inventing a vote', () => {
    const value = discovered();
    value.events.push(event({ id: 'route', turn: 5, kind: 'consequence', text: 'Tied votes used the announced hill road.', journey: { nodeId: 'town', transition: { edgeId: 'town-road', from: 'town', to: 'road', reason: 'fallback', unlockEventIds: [], costIds: ['road-supplies'], votes: {} } } }));
    const moment = storyTableLastTurn(value, 'moss');
    expect(moment?.text).toContain('Tied or absent votes');
    expect(moment?.detail).toContain('announced hill road');
    expect(moment?.items).toEqual([]);
    expect(moment?.actorNames).toEqual([]);
  });
  it('retains a specific practical result when there is no quest pickup', () => {
    const value = room();
    value.events.push(event({ actorId: 'moss', actorName: 'Moss', contribution: true, text: 'Moss helped Oren pack the lantern.', change: { title: 'A lantern for the road', text: 'The first strike has one less damage to get through.', next: 'It remains packed if you avoid battle.' }, result: { changed: true } }));
    expect(storyTableLastTurn(value, 'moss')?.title).toBe('A lantern for the road');
    expect(storyTableLastTurn(value, 'moss')?.detail).toContain('It remains packed if you avoid battle');
  });
  it('shows the recorded final change rather than an earlier successful action', () => {
    const value = discovered();
    value.status = 'completed'; value.chapter = 2;
    value.expedition!.ending = 'The spark is free. Neighbours share safe lanterns.';
    value.events.push(event({ id: 'ending', turn: 12, chapter: 2, kind: 'consequence', text: value.expedition!.ending, change: { title: 'Lanterns light the quay', text: value.expedition!.ending, next: 'The ferry comes home.' } }));
    const view = buildStoryTable(value, 'moss');
    expect(view.lastTurn?.title).toBe('Lanterns light the quay');
    expect(view.situation).toBe(value.expedition!.ending);
    expect(view.chapterSteps.every(step => step.state === 'done')).toBe(true);
  });
});
