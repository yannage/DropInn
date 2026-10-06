import { describe, expect, it } from 'vitest';
import { avalonContent, createAvalonEpisode } from './avalonContent';
import { avalonDiceContent, avalonDiceResolutionCost } from './avalonDiceContent';
import type { QuestRunContent } from './questRunTypes';

const allOptions = (content: QuestRunContent) => content.nodes.flatMap(node => node.targets.flatMap(target => target.options));
const episodes = Array.from({ length: 90 }, (_, index) => {
  const episode = createAvalonEpisode(`dice-content-${index}`);
  episode.manifest.contentVersion = 2;
  return episode;
});

describe('Avalon v2 authored challenges', () => {
  it('preserves the v1 definition and immutable generated world while adding a versioned set of approaches', () => {
    for (const episode of episodes) {
      const manifest = structuredClone(episode.manifest);
      const before = avalonContent(episode);
      const dice = avalonDiceContent(episode);
      expect(avalonContent(episode)).toEqual(before);
      expect(episode.manifest).toEqual(manifest);
      expect(before.version).toBe(1);
      expect(allOptions(before).some(option => option.challenge)).toBe(false);
      expect(dice.version).toBe(2);
      expect(dice.startNodeId).toBe(before.startNodeId);
      expect(dice.nodes.map(node => ({ id: node.id, art: node.art }))).toEqual(before.nodes.map(node => ({ id: node.id, art: node.art })));
      expect(dice.edges.filter(edge => !edge.id.includes('skiff'))).toEqual(before.edges);
    }
  });

  it('gives every possible arrival an optional immediate check and a safe essential lead without crowding the stage', () => {
    for (const episode of episodes) {
      const content = avalonDiceContent(episode);
      const arrival = content.nodes.find(node => node.id === content.startNodeId)!;
      const options = arrival.targets.flatMap(target => target.options);
      expect(options.some(option => option.challenge && !option.requires?.length)).toBe(true);
      expect(options.some(option => option.avalon?.discoverThread && !option.challenge && !option.requires?.length)).toBe(true);
      expect(content.nodes.every(node => node.targets.length <= 3)).toBe(true);
    }
  });

  it('keeps source discoveries, essential resolution alternatives and ordinary movement free of dice gates', () => {
    for (const episode of episodes) {
      const content = avalonDiceContent(episode), options = allOptions(content);
      for (const option of options.filter(option => option.completeObjective || option.avalon?.discoverThreads)) expect(option.challenge).toBeUndefined();
      if (episode.manifest.conflictIds.includes('bitter-water')) expect(options.find(option => option.id === 'water-seal-vat')?.challenge).toBeUndefined();
      if (episode.manifest.conflictIds.includes('stranded-herd')) expect(options.find(option => option.id === 'herd-gate')?.challenge).toBeUndefined();
      if (episode.manifest.conflictIds.includes('missing-carter')) {
        expect(options.find(option => option.id === 'carter-brace')?.challenge).toBeUndefined();
        expect(options.find(option => option.id === 'carter-walk')?.challenge).toBeUndefined();
      }
      const reached = new Set([content.startNodeId]);
      for (let pass = 0; pass < 6; pass++) for (const edge of content.edges.filter(edge => !edge.requires?.length)) if (reached.has(edge.from)) reached.add(edge.to);
      expect(reached.size).toBe(6);
    }
  });

  it('shares one obstacle across alternate methods but varies stats, difficulty, tool requirements or supply cost', () => {
    const groups = new Map<string, ReturnType<typeof allOptions>>();
    for (const episode of episodes) for (const option of allOptions(avalonDiceContent(episode)).filter(option => option.challenge)) {
      const group = groups.get(option.challenge!.id) ?? [];
      if (!group.some(previous => previous.id === option.id)) group.push(option);
      groups.set(option.challenge!.id, group);
    }
    expect(groups.size).toBe(6);
    expect(new Set([...groups.values()].flat().map(option => option.challenge!.attribute))).toEqual(new Set(['might', 'wits', 'heart']));
    for (const options of groups.values()) {
      expect(options).toHaveLength(2);
      expect(new Set(options.map(option => option.challenge!.attribute)).size).toBe(2);
      expect(new Set(options.map(option => JSON.stringify([option.challenge!.dc, option.requires, option.supplyDelta]))).size).toBe(2);
      for (const option of options) {
        expect(option.challenge!.setupLabel).toBeTruthy();
        expect(option.challenge!.failure).toBeTruthy();
        expect(option.challenge!.success).toBeTruthy();
        expect(option.check).toBeUndefined();
      }
    }
  });

  it('makes the safe and risky harvests competing choices rather than repeatable reward sources', () => {
    const options = allOptions(avalonDiceContent(episodes[0]));
    for (const id of ['inn-pack', 'inn-request-reserve', 'inn-release-reserve']) expect(options.find(option => option.id === id)?.absent).toContain('inn-lunch-taken');
    for (const id of ['bank-gather-reeds', 'bank-haul-reeds', 'bank-rig-reeds']) expect(options.find(option => option.id === id)?.absent).toContain('reeds-gathered');
    expect(options.find(option => option.id === 'inn-pack')?.supplyDelta).toBe(2);
    expect(options.find(option => option.id === 'inn-request-reserve')?.supplyDelta).toBe(3);
    expect(options.find(option => option.id === 'bank-gather-reeds')?.supplyDelta).toBe(2);
    expect(options.find(option => option.id === 'bank-haul-reeds')?.supplyDelta).toBe(3);
  });

  it('shows every unlocked risky alternative alongside safe methods in the source discovery’s immediate follow-up', () => {
    const inspected = new Set<string>();
    const discoveries: Record<string, string> = { 'mill-vat': 'water-inspect-vat', 'spring-flock': 'herd-survey', 'quarry-cart': 'carter-check' };
    for (const episode of episodes) for (const target of avalonDiceContent(episode).nodes.flatMap(node => node.targets)) {
      const source = target.options.find(option => option.id === discoveries[target.id]);
      if (!source) continue;
      inspected.add(target.id);
      const known = new Set([...(source.discover ?? []), 'tools-found']);
      const unlocked = target.options.filter(option => (option.requires ?? []).every(fact => known.has(fact)) && !(option.absent ?? []).some(fact => known.has(fact)));
      const safeMethods = unlocked.filter(option => option.avalon?.resolveThread && !option.challenge);
      const riskyMethods = unlocked.filter(option => option.challenge);
      expect(safeMethods.length).toBeGreaterThan(0);
      expect(riskyMethods).toHaveLength(2);
      for (const option of [...safeMethods, ...riskyMethods]) expect(source.followUp).toContain(option.id);
      expect(new Set(source.followUp).size).toBe(source.followUp!.length);
      expect(source.followUp!.every(id => target.options.some(option => option.id === id))).toBe(true);
    }
    expect(inspected).toEqual(new Set(['mill-vat', 'spring-flock', 'quarry-cart']));
  });

  it('makes the skiff a real optional route and changes its image only after confirmed success', () => {
    const before = avalonDiceContent(episodes[0]);
    const after = avalonDiceContent(episodes[0], ['skiff-afloat']);
    const skiff = (content: QuestRunContent) => content.nodes.flatMap(node => node.targets).find(target => target.id === 'ford-kit')!;
    expect(skiff(before).artKey).toBe('stranded-boat.png');
    expect(skiff(after).artKey).toBe('boat-afloat');
    const waterRoutes = after.edges.filter(edge => edge.id.includes('skiff'));
    expect(waterRoutes).toHaveLength(2);
    expect(waterRoutes.every(edge => edge.requires?.includes('skiff-afloat'))).toBe(true);
    expect(skiff(after).options.find(option => option.id === 'ford-borrow-tools')).toBeDefined();
  });

  it('reports the successful method’s real cost without importing v1’s more expensive price', () => {
    expect(avalonDiceResolutionCost('bitter-water', 'seal', ['vat-sealed-economically'])).toContain('One shared supply');
    expect(avalonDiceResolutionCost('bitter-water', 'seal', [])).toContain('Two shared supplies');
    expect(avalonDiceResolutionCost('stranded-herd', 'fence', ['gate-repaired-without-supplies'])).toContain('no shared supply');
    expect(avalonDiceResolutionCost('stranded-herd', 'fence', [])).toContain('One shared supply');
    expect(avalonDiceResolutionCost('missing-carter', 'brace', ['cart-braced-with-one-pack'])).toContain('one shared supply');
    expect(avalonDiceResolutionCost('missing-carter', 'brace', [])).toContain('Two shared supply packs');
    for (const episode of episodes) for (const option of allOptions(avalonDiceContent(episode)).filter(option => option.challenge?.id === 'quarry-axle')) {
      expect(option.absent).toContain('resolved:missing-carter');
      expect(option.avalon?.resolveThread).toBe('missing-carter');
    }
  });
});
