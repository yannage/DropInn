import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneArt, sceneArtwork } from './SceneArt';
import { KeepsakeArtwork } from './KeepsakeArtwork';
import { CHAPTERS } from '../../lib/dropinn/content';
import { existsSync } from 'node:fs';
import { ADVENTURE_VERSIONS } from '../../lib/dropinn/registry';
import { QUEST_RUN_CONTENT } from '../../lib/dropinn/questRunContent';
import { QUEST_SCENES, QUEST_ITEM_ART, questPieceArtwork, questPiecePresentation } from './QuestArtwork';
import type { QuestRunState } from '../../lib/dropinn/questRunTypes';
import { avalonContent, createAvalonEpisode } from '../../lib/dropinn/avalonContent';

describe('homemade adventure artwork', () => {
  it('resolves every pinned chapter and Mosswater place to a real asset', () => {
    for (const story of ADVENTURE_VERSIONS) for (const chapter of story.chapters) {
      expect(existsSync(`public${sceneArtwork(chapter.art).src}`), `${story.id}@${story.version}: ${chapter.art}`).toBe(true);
    }
    for (const node of QUEST_RUN_CONTENT.nodes) expect(existsSync(`public${sceneArtwork(QUEST_SCENES[node.id]).src}`), node.id).toBe(true);
    for (const [id, file] of Object.entries(QUEST_ITEM_ART)) expect(existsSync(`public/art/${file}${/\.(png|webp)$/.test(file) ? '' : '.webp'}`), id).toBe(true);
  });

  it('renders every seeded Avalon cast, place, outcome and keepsake with a real illustration', () => {
    for (let seed = 0; seed < 30; seed++) {
      const episode = createAvalonEpisode(`art-${seed}`);
      const views = [avalonContent(episode), ...episode.threads.flatMap(thread => {
        const outcomes = thread.id === 'bitter-water' ? ['seal', 'bargain', 'haul'] : thread.id === 'missing-carter' ? ['repair', 'brace', 'leave'] : ['feed', 'fence', 'fight'];
        return outcomes.map(resolutionId => { const copy = structuredClone(episode); const changed = copy.threads.find(item => item.id === thread.id)!; changed.status = 'resolved'; changed.resolutionId = resolutionId; return avalonContent(copy); });
      })];
      for (const content of views) {
        for (const node of content.nodes) {
          expect(existsSync(`public${sceneArtwork(node.art).src}`), node.id).toBe(true);
          for (const target of node.targets) {
            const file = target.artKey!;
            expect(existsSync(`public/art/${file}${/\.(png|webp)$/.test(file) ? '' : '.webp'}`), target.id).toBe(true);
          }
        }
        for (const chapter of content.chapters) {
          const html = renderToStaticMarkup(<KeepsakeArtwork name={chapter.keepsake} />);
          const src = html.match(/src="([^"]+)"/)?.[1];
          expect(src).toBeTruthy(); expect(existsSync(`public${src}`)).toBe(true);
        }
      }
    }
  });

  it('shows truthful quest states without replacing the original pinned story data', () => {
    const state: Pick<QuestRunState, 'facts' | 'ending' | 'usedOptions'> = { facts: [], usedOptions: [] };
    expect(questPieceArtwork('dye-vat', 'mosswater-dye-vat', state)).toBe('mosswater-dye-vat');
    expect(questPieceArtwork('old-sluice', 'story-sluice', state)).toBe('mosswater-sluice-blocked');
    state.facts = ['source-isolated', 'channel-open', 'ridge-shortcut'].map(id => ({ id, sourceEventId: 'event', actorId: 'hero', actorName: 'Hero', nodeId: 'watercourse' }));
    expect(questPieceArtwork('dye-vat', 'mosswater-dye-vat', state)).toBe('mosswater-feed-clear');
    state.usedOptions.push('vat-isolate');
    expect(questPieceArtwork('dye-vat', 'mosswater-dye-vat', state)).toBe('mosswater-vat-contained');
    expect(questPieceArtwork('old-sluice', 'story-sluice', state)).toBe('story-sluice');
    expect(questPieceArtwork('ridge-path', 'gate.png', state)).toBe('gate-sheltered');
    const sluice = QUEST_RUN_CONTENT.nodes.flatMap(node => node.targets).find(target => target.id === 'old-sluice')!;
    const ridge = QUEST_RUN_CONTENT.nodes.flatMap(node => node.targets).find(target => target.id === 'ridge-path')!;
    expect(questPiecePresentation(sluice, state).name).toBe('Open water gate');
    expect(questPiecePresentation(sluice, state).context).not.toMatch(/holds the gate down/);
    expect(questPiecePresentation(ridge, state).name).toBe('Secured ridge handline');
    expect(questPiecePresentation(ridge, state).context).not.toMatch(/cannot support/);
    state.ending = { id: 'repair', text: 'A new route.', sourceEventId: 'ending' };
    expect(questPieceArtwork('well', 'mosswater-well', state)).toBe('mosswater-well-sealed');
    for (const node of QUEST_RUN_CONTENT.nodes) for (const target of node.targets) {
      for (const view of [state, { facts: [], usedOptions: [] }]) {
        const file = questPieceArtwork(target.id, target.artKey, view)!;
        expect(existsSync(`public/art/${file}${/\.(png|webp)$/.test(file) ? '' : '.webp'}`), target.id).toBe(true);
      }
    }
  });

  it('illustrates each Mosswater keepsake with a local reward asset', () => {
    for (const chapter of QUEST_RUN_CONTENT.chapters) {
      const html = renderToStaticMarkup(<KeepsakeArtwork name={chapter.keepsake} />);
      const src = html.match(/src="([^"]+)"/)?.[1];
      expect(src).toBeTruthy();
      expect(existsSync(`public${src}`)).toBe(true);
    }
  });
  it('supplies local landscape assets and readable descriptions for every authored chapter', () => {
    for (const chapter of CHAPTERS) {
      const html = renderToStaticMarkup(<SceneArt scene={chapter.art} className="test-banner" />);
      expect(html).toContain(`src="/art/scene-${chapter.art}.png"`);
      expect(html).toContain('alt="A ');
      expect(html).toContain('test-banner');
      expect(existsSync(`public/art/scene-${chapter.art}.png`)).toBe(true);
    }
  });

  it('illustrates the existing keepsake names without changing their identity', () => {
    for (const chapter of CHAPTERS) {
      const html = renderToStaticMarkup(<KeepsakeArtwork name={chapter.keepsake} />);
      expect(html).toContain('<img');
      expect(html).toContain('alt=""');
      expect(html).toContain('aria-hidden="true"');
    }
    expect(renderToStaticMarkup(<KeepsakeArtwork name="A future keepsake" />)).not.toContain('<img');
    expect(renderToStaticMarkup(<KeepsakeArtwork name="toString" />)).not.toContain('<img');
  });
});
