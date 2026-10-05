import { describe, expect, it } from 'vitest';
import { STORY_CHOICES, selectedStory, storyChoiceKey } from './storySelection';
import { currentAdventure } from './registry';

describe('remembered story editions', () => {
  it('keeps the new quest and both earlier Gemward loops selectable independently', () => {
    expect(STORY_CHOICES.slice(0, 3).map(storyChoiceKey)).toEqual(['mosswater@1', 'gemward@3', 'gemward@2']);
    expect(new Set(STORY_CHOICES.map(storyChoiceKey)).size).toBe(STORY_CHOICES.length);
    for (const choice of STORY_CHOICES) expect(selectedStory(storyChoiceKey(choice))).toBe(choice);
  });
  it('migrates ID-only preferences to the current release without changing pinned preferences', () => {
    expect(selectedStory('gemward')).toBe(currentAdventure('gemward'));
    expect(selectedStory('gemward@2').version).toBe(2);
    expect(selectedStory('briar-glen')).toBe(currentAdventure('briar-glen'));
    for (const invalid of [null, '', 'missing@3', 'gemward@999']) expect(storyChoiceKey(selectedStory(invalid))).toBe('mosswater@1');
  });
});
