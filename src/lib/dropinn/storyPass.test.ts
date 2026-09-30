import { describe, expect, it } from 'vitest';
import { STORY_PASS, storyPassProgress, passSale, type PassCredit } from './storyPass';

const story = [...STORY_PASS.stories];
const run = (id: string, number: number): PassCredit[] => [0,1,2].map(chapter => ({roomId:`${id}-${number}`,adventureId:id,adventureVersion:1,chapter,at:number*1000+chapter}));

describe('First Tales Story Pass', () => {
  it('credits every ending equally, caps repeated room credit, and completes after six varied runs', () => {
    const four = story.flatMap(id => run(id,1));
    expect(storyPassProgress(four,'free').points).toBe(800);
    const six = [...four,...run(story[0],2),...run(story[0],3)];
    const pass = storyPassProgress([...six,...run(story[0],3)],'standard');
    expect(pass.points).toBe(1000);
    expect(pass.step).toBe(10);
    expect(pass.credits).toHaveLength(18);
    expect(pass.items).toContain('shoes:ruby');
    expect(pass.hats).toEqual(['pilot-cap','breakfast-nightcap','apple-blossom-crown']);
  });
  it('counts shorter visits and grants paid rewards only after purchase', () => {
    const partial = [run(story[0],1)[0]];
    expect(storyPassProgress(partial,'free').points).toBe(100);
    expect(storyPassProgress(partial,'free').items).toEqual([]);
    expect(storyPassProgress(partial,'standard').items).toEqual(['hair:wayward-curls']);
    const supporter = storyPassProgress(partial,'super');
    expect(supporter.items).toEqual(expect.arrayContaining(['hair:wayward-curls','eyes:starry','frame:inn-border']));
    expect(supporter.step).toBe(1);
  });
  it('keeps progress after the eight-week sales window', () => {
    const start = '2026-10-01T00:00:00.000Z';
    const atStart = passSale(start,Date.parse(start));
    expect(atStart.open).toBe(true);
    expect(passSale(start,Date.parse(atStart.endsAt!)).open).toBe(false);
    expect(storyPassProgress(run(story[0],1),'standard').step).toBe(2);
  });
});
