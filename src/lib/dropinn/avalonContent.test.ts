import { describe, expect, it } from 'vitest';
import { AVALON_THREADS, AVALON_WORLD, avalonContent, avalonReturnText, createAvalonEpisode } from './avalonContent';
import type { AvalonConflictId } from './avalonTypes';

const episodes = Array.from({ length: 160 }, (_, index) => createAvalonEpisode(`atlas-fixture-${index}`));
const withThread = (id: AvalonConflictId) => structuredClone(episodes.find(episode => episode.manifest.conflictIds.includes(id))!);

describe('Avalon authored generation contract', () => {
  it('pins a deterministic, JSON-safe episode while varying arrivals, conflicts, visitors and linked causes', () => {
    for (const episode of episodes) expect(createAvalonEpisode(episode.manifest.seed)).toEqual(JSON.parse(JSON.stringify(episode)));
    expect(new Set(episodes.map(episode => episode.manifest.startNodeId)).size).toBe(3);
    expect(new Set(episodes.map(episode => [...episode.manifest.conflictIds].sort().join(','))).size).toBe(3);
    expect(new Set(episodes.map(episode => JSON.stringify(episode.manifest.cast))).size).toBeGreaterThan(4);
    expect(new Set(episodes.filter(episode => episode.manifest.conflictIds.includes('bitter-water') && episode.manifest.conflictIds.includes('missing-carter')).map(episode => episode.manifest.linked))).toEqual(new Set([true, false]));
  });

  it('keeps the same connected atlas, two streams and one lake in every visit', () => {
    expect(AVALON_WORLD.waters.map(water => water.id)).toEqual(['larch-run', 'reed-brook', 'merewater']);
    const baseline = avalonContent(episodes[0]);
    for (const episode of episodes) {
      const content = avalonContent(episode);
      expect(content.nodes.map(({ id, label, art }) => ({ id, label, art }))).toEqual(baseline.nodes.map(({ id, label, art }) => ({ id, label, art })));
      expect(content.edges).toEqual(baseline.edges);
      const reached = new Set([content.startNodeId]);
      for (let i = 0; i < 6; i++) for (const edge of content.edges) if (reached.has(edge.from)) reached.add(edge.to);
      expect(reached.size).toBe(6);
    }
  });

  it('starts with a local, prerequisite-free lead and never exceeds three touch targets', () => {
    for (const episode of episodes) {
      const content = avalonContent(episode);
      const arrival = content.nodes.find(node => node.id === content.startNodeId)!;
      expect(arrival.targets.flatMap(target => target.options).some(option => option.avalon?.discoverThread && !option.requires?.length)).toBe(true);
      expect(content.nodes.every(node => node.targets.length > 0 && node.targets.length <= 3)).toBe(true);
      expect(new Set(content.nodes.flatMap(node => node.targets.map(target => target.id))).size).toBe(content.nodes.flatMap(node => node.targets).length);
      const options = content.nodes.flatMap(node => node.targets.flatMap(target => target.options));
      expect(new Set(options.map(option => option.id)).size).toBe(options.length);
    }
  });

  it('has one consistent home for each NPC and independent physical sources for every selected clue', () => {
    for (const episode of episodes) {
      const members = Object.values(episode.manifest.cast);
      expect(new Set(members.map(member => member.npcId)).size).toBe(members.length);
      expect(episode.manifest.cast.host).toMatchObject({ npcId: 'wren', nodeId: 'larch-inn' });
      const targets = avalonContent(episode).nodes.flatMap(node => node.targets);
      for (const id of episode.manifest.conflictIds) {
        const sources = episode.manifest.clueAssignments[id];
        expect(episode.manifest.cast[sources.npcRole]).toBeDefined();
        expect(sources.physicalTargetIds.length).toBeGreaterThanOrEqual(2);
        for (const targetId of sources.physicalTargetIds) expect(targets.find(target => target.id === targetId)?.options.some(option => option.avalon?.discoverThread === id)).toBe(true);
      }
    }
  });

  it('only links evidence for a saved shared cause and reveals both threads when that connection is confirmed', () => {
    for (const episode of episodes.filter(episode => episode.manifest.conflictIds.includes('bitter-water') && episode.manifest.conflictIds.includes('missing-carter'))) {
      const options = avalonContent(episode).nodes.flatMap(node => node.targets.flatMap(target => target.options));
      const water = options.find(option => option.id === 'water-inspect-vat')!;
      const carter = options.find(option => option.id === 'carter-check')!;
      expect(water.discover?.includes('shared-cause')).toBe(episode.manifest.linked);
      expect(carter.discover?.includes('shared-cause')).toBe(episode.manifest.linked);
      expect(water.avalon?.discoverThreads ?? []).toEqual(episode.manifest.linked ? ['missing-carter'] : []);
      expect(carter.avalon?.discoverThreads ?? []).toEqual(episode.manifest.linked ? ['bitter-water'] : []);
    }
  });

  it('offers each conflict distinct supply, travel or combat costs without replacing a settled outcome', () => {
    for (const id of Object.keys(AVALON_THREADS) as AvalonConflictId[]) {
      const episode = withThread(id);
      const options = avalonContent(episode).nodes.flatMap(node => node.targets.flatMap(target => target.options)).filter(option => option.avalon?.resolveThread === id);
      expect(new Set(options.map(option => option.avalon?.resolutionId))).toEqual(new Set(Object.keys(AVALON_THREADS[id].resolutions)));
      for (const option of options) expect(option.absent).toContain(`resolved:${id}`);
      expect(options.some(option => option.supplyDelta === -2)).toBe(true);
      expect(options.some(option => !option.supplyDelta)).toBe(true);
    }
  });

  it('shows truthful before/after battle and resolution art rather than silently repairing another route', () => {
    const water = withThread('bitter-water');
    const targets = (episode: typeof water, evidence: string[] = []) => avalonContent(episode, evidence).nodes.flatMap(node => node.targets);
    expect(targets(water, ['encounter-cleared:mossback']).find(target => target.id === 'mill-mossback')?.artKey).toBe('tracks.png');
    Object.assign(water.threads.find(thread => thread.id === 'bitter-water')!, { status: 'resolved', resolutionId: 'seal' });
    expect(targets(water).find(target => target.id === 'mill-mossback')?.artKey).toBe('mosswater-mossback');
    expect(targets(water).find(target => target.id === 'mill-vat')?.artKey).toBe('mosswater-vat-contained');
    const herd = withThread('stranded-herd');
    for (const resolutionId of ['feed', 'fight', 'fence']) {
      Object.assign(herd.threads.find(thread => thread.id === 'stranded-herd')!, { status: 'resolved', resolutionId });
      expect(targets(herd).find(target => target.id === 'spring-flock')?.artKey).toBe(resolutionId === 'fence' ? 'gate-sheltered' : 'tracks.png');
    }
  });

  it('keeps an unfinished promise and unresolved trouble visible in the return instead of granting a false success', () => {
    const episode = withThread('bitter-water');
    Object.assign(episode.threads.find(thread => thread.id === 'bitter-water')!, { status: 'resolved', resolutionId: 'bargain' });
    episode.promise = { id: 'washpond-reeds', status: 'owed' };
    expect(avalonReturnText(episode)).toContain('still owed');
    expect(avalonReturnText(episode)).toContain('Still open:');
    expect(avalonReturnText(episode)).not.toContain('Both local troubles are settled');
    episode.promise.status = 'kept';
    expect(avalonReturnText(episode)).toContain('reed bed is ready');
    const other = episode.threads.find(thread => thread.id !== 'bitter-water')!;
    other.status = 'active'; other.pressure = 3; other.pressureSupplySpent = false;
    expect(avalonContent(episode).facts[AVALON_THREADS[other.id].pressureFact].description).toContain('No shared supply remained');
  });
});
