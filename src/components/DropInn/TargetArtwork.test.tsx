import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCharacterProfile } from '../../lib/character';
import { createAdventure } from '../../lib/dropinn/engine';
import { getScene, developScene } from '../../lib/dropinn/scene';
import { CHAPTERS } from '../../lib/dropinn/content';
import { TargetArtwork } from './TargetArtwork';
import { ActionTable } from './ActionTable';
import { SceneStageArt } from './SceneStageArt';

describe('encounter artwork', () => {
  it('keeps the four initial target labels and accessible controls alongside decorative images', () => {
    const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'artist', 1000, 'ART001');
    const targets = getScene(room).targets;
    const html = renderToStaticMarkup(<ActionTable room={room} userId="artist" targets={targets}
      token="assist" targetId="mara" downed={false} disabled={false} turn={room.turn}
      onChoose={() => {}} onConfirm={() => {}} preview="Help Mara" active />);
    expect(html.match(/class="di-target-art"/g)).toHaveLength(4);
    expect(html.match(/src="\/art\/token-/g)).toHaveLength(4);
    for (const target of targets) {
      expect(html).toContain(`aria-label="${target.name}"`);
      expect(html).toContain(`<strong>${target.name}</strong>`);
    }
    expect(html.match(/alt=""/g)).toHaveLength(8);
    expect(html.match(/draggable="false"/g)).toHaveLength(8);
  });

  it('replaces the initial illustration with accurate developed art for the first chapter', () => {
    const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'artist', 1000, 'ART002');
    for (const target of CHAPTERS[0].targets) {
      expect(renderToStaticMarkup(<TargetArtwork target={target} />)).toContain('<img');
      developScene(room, { targetId: target.id, token: 'assist' });
      const updated = getScene(room).targets.find(item => item.id === target.id)!;
      expect(updated.changed).toBe(true);
      const updatedHtml = renderToStaticMarkup(<TargetArtwork target={updated} />);
      expect(updatedHtml).toContain('<img');
      expect(updatedHtml).not.toEqual(renderToStaticMarkup(<TargetArtwork target={target} />));
    }
  });

  it('illustrates every authored initial target and all ten actual scene developments', () => {
    let developmentCount = 0;
    for (const target of CHAPTERS.flatMap(chapter => chapter.targets)) {
      const html = renderToStaticMarkup(<TargetArtwork target={target} />);
      expect(html).toContain('<img');
      expect(html).toContain('alt=""');
      const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'artist', 1000, 'ART003');
      const change = developScene(room, { targetId: target.id, token: 'assist' });
      const developedHtml = renderToStaticMarkup(<TargetArtwork target={{ ...target, changed: true }} />);
      if (change) {
        developmentCount++;
        expect(developedHtml).toContain('<img');
        expect(developedHtml).not.toEqual(html);
      } else {
        expect(developedHtml).toBe('');
      }
    }
    expect(developmentCount).toBe(10);
  });

  it('shows authored enemy poses without changing ordinary target artwork', () => {
    for (const [id, source] of [['pack', 'shadow-pack'], ['gloamfang', 'gloamfang']]) {
      for (const pose of ['windup', 'reaction'] as const) {
        expect(renderToStaticMarkup(<TargetArtwork target={{ id }} pose={pose} />))
          .toContain(`/art/${source}-${pose}.webp`);
      }
    }
    expect(renderToStaticMarkup(<TargetArtwork target={{ id: 'mara', changed: true }} pose="reaction" />))
      .toContain('/art/mara-safe.webp');
  });

  it('uses decorative background-only stages for each chapter', () => {
    for (const [chapter, name] of ['village', 'river', 'chapel'].entries()) {
      const html = renderToStaticMarkup(<SceneStageArt chapter={chapter} />);
      expect(html).toContain(`/art/stage-${name}.webp`);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('draggable="false"');
    }
    expect(renderToStaticMarkup(<SceneStageArt chapter={-1} />)).toBe('');
  });

  it('leaves unknown targets text-only', () => {
    for (const target of [{ id: 'new-encounter' }, { id: 'toString' }]) {
      expect(renderToStaticMarkup(<TargetArtwork target={target} />)).toBe('');
    }
  });
});
