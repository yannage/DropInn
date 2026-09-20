import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCharacterProfile } from '../../lib/character';
import { createAdventure } from '../../lib/dropinn/engine';
import { getScene, developScene } from '../../lib/dropinn/scene';
import { CHAPTERS } from '../../lib/dropinn/content';
import { TargetArtwork } from './TargetArtwork';
import { ActionTable } from './ActionTable';

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

  it('removes stale illustrations when gameplay develops each first-chapter target', () => {
    const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'artist', 1000, 'ART002');
    for (const target of CHAPTERS[0].targets) {
      expect(renderToStaticMarkup(<TargetArtwork target={target} />)).toContain('<img');
      developScene(room, { targetId: target.id, token: 'assist' });
      const updated = getScene(room).targets.find(item => item.id === target.id)!;
      expect(updated.changed).toBe(true);
      expect(renderToStaticMarkup(<TargetArtwork target={updated} />)).toBe('');
    }
  });

  it('illustrates every authored initial target and hides stale art after any development', () => {
    for (const target of CHAPTERS.flatMap(chapter => chapter.targets)) {
      const html = renderToStaticMarkup(<TargetArtwork target={target} />);
      expect(html).toContain('<img');
      expect(html).toContain('alt=""');
      expect(renderToStaticMarkup(<TargetArtwork target={{ ...target, changed: true }} />)).toBe('');
    }
  });

  it('leaves unknown targets text-only', () => {
    for (const target of [{ id: 'new-encounter' }, { id: 'toString' }]) {
      expect(renderToStaticMarkup(<TargetArtwork target={target} />)).toBe('');
    }
  });
});
