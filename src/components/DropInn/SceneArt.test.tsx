import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneArt } from './SceneArt';
import { KeepsakeArtwork } from './KeepsakeArtwork';
import { CHAPTERS } from '../../lib/dropinn/content';
import { existsSync } from 'node:fs';

describe('homemade adventure artwork', () => {
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
