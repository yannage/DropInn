import { describe, expect, it } from 'vitest';
import { STORY_CHOICES, selectedStory, storyChoiceKey } from './storySelection';
import { currentAdventure } from './registry';

describe('remembered story editions', () => {
  it('keeps dice, living world and the earlier loops selectable independently', () => {
    expect(STORY_CHOICES.slice(0, 5).map(storyChoiceKey)).toEqual(['avalon@2', 'avalon@1', 'mosswater@1', 'gemward@3', 'gemward@2']);
    expect(new Set(STORY_CHOICES.map(storyChoiceKey)).size).toBe(STORY_CHOICES.length);
    for (const choice of STORY_CHOICES) expect(selectedStory(storyChoiceKey(choice))).toBe(choice);
  });
  it('migrates ID-only preferences to the current release without changing pinned preferences', () => {
    expect(selectedStory('gemward')).toBe(currentAdventure('gemward'));
    expect(selectedStory('gemward@2').version).toBe(2);
    expect(selectedStory('avalon')).toBe(currentAdventure('avalon'));
    expect(selectedStory('avalon@1').version).toBe(1);
    expect(selectedStory('briar-glen')).toBe(currentAdventure('briar-glen'));
    for (const invalid of [null, '', 'missing@3', 'gemward@999']) expect(storyChoiceKey(selectedStory(invalid))).toBe('avalon@2');
  });
});
