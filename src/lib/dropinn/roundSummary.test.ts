import { describe, expect, it } from 'vitest';
import { latestRound, roundCallouts, roundSummaries } from './roundSummary';
import { ADVENTURES } from './registry';
import { getScene } from './scene';
import type { AdventureRoom, StoryEvent } from './types';

const action: StoryEvent = { id:'a', chapter:0, turn:2, at:1000, kind:'action', actorId:'old-player', actorName:'Wren', text:'Wren succeeds: study a weakness at the stranded boat.', roll:15, modifier:2, success:true, contribution:true, result:{targetId:'boat',targetKind:'scene',token:'investigate',progress:1,insight:2} };
const room = (events: StoryEvent[], extra: Partial<AdventureRoom> = {}) => ({ id:'table',chapter:0,turn:2,phase:'reveal',events,outcomes:[],seats:[],players:{},flags:[], ...extra } as AdventureRoom);

describe('shared round story', () => {
  it('deduplicates delivery, groups actors on one target, and preserves departed names and original prose', () => {
    const b = { ...action, id:'b', actorId:'b',actorName:'Bran',text:'Bran helps at the stranded boat.' };
    const source = room([action,b,action]);
    const summary = latestRound(source)!;
    expect(summary.entries).toHaveLength(2);
    expect(summary.entries[0]).toMatchObject({actorName:'Wren',text:action.text,math:'15 + 2 = 17'});
    expect(roundCallouts(summary)).toHaveLength(1);
    expect(roundCallouts(summary)[0].text).toContain('Bran');
    expect(latestRound({...source,players:{},seats:[],flags:['boat-freed']})).toEqual(summary);
  });
  it('keeps failed attempts and their costs separate from authored changes', () => {
    const summary = latestRound(room([{...action,success:false,result:{targetId:'boat',targetKind:'scene',progress:.5,danger:.5},change:{title:'Should not be credited',text:'',next:''}}]))!;
    expect(summary.entries[0].consequence).toBe('+0.5 progress · +0.5 danger');
    expect(summary.headline).not.toContain('Should not');
  });
  it('separates guaranteed aid, inactivity, companion support, and the party strike', () => {
    const events: StoryEvent[] = [
      {...action,id:'protect',roll:undefined,result:{targetId:'friend',targetKind:'hero',protection:3,progress:0}},
      {...action,id:'mend',roll:undefined,result:{targetId:'friend',targetKind:'hero',healing:2,progress:0}},
      {...action,id:'away',contribution:false,roll:undefined,result:undefined,text:'Wren sits out.'},
      {...action,id:'companion',actorId:'companion-2',kind:'consequence',result:undefined,roll:undefined,text:'Pip (AI companion) supports with cover.'},
      {...action,id:'strike',kind:'consequence',roll:undefined,result:{targetKind:'hero',targetId:'friend',damage:1},text:'Bran takes 1 damage.'},
    ];
    const entries = latestRound(room(events))!.entries;
    expect(entries.map(item => item.kind)).toEqual(['action','action','inactive','companion','consequence']);
    expect(entries[0].math).toBeUndefined();
    expect(entries[0].consequence).toBe('3 protection');
    expect(entries[1].consequence).toBe('+2 HP');
    expect(entries[4].text).toBe('Bran takes 1 damage.');
  });
  it('retains the previous chapter on a late join and never presents an arrival as a resolved turn', () => {
    const source = room([action,{...action,id:'arrival',kind:'arrival',chapter:1,turn:2,text:'A new chapter begins.'}],{chapter:1,turn:3,phase:'choosing'});
    expect(latestRound(source)?.chapter).toBe(0);
    expect(latestRound(room([action],{phase:'choosing'}))).toBeUndefined();
    expect(roundSummaries(source)).toHaveLength(1);
  });
  it('keeps legacy text and attaches a chapter ending only to its resolved round', () => {
    const legacy = {...action,result:undefined,roll:undefined,text:'A remembered move.'};
    const summary = latestRound(room([legacy],{outcomes:[{chapter:0,at:1000,result:'mixed',text:'Everyone reaches the bank.'}]}))!;
    expect(summary.entries[0].text).toBe('A remembered move.');
    expect(summary.entries[0].benefits).toEqual([]);
    expect(summary.entries[1].kind).toBe('consequence');
    expect(summary.headline).toBe('Everyone reaches the bank.');
  });
  it('keeps opposed arithmetic, shared branch decisions and actual developments', () => {
    const summary = latestRound(room([{...action,result:{...action.result,duel:{enemyRoll:10,enemyModifier:3,enemyTotal:13,playerTotal:17}},change:{title:'The boat is afloat',text:'It slips free.',next:'Guide the party aboard.'}},
      {...action,id:'route',kind:'consequence',actorId:undefined,actorName:undefined,result:undefined,text:'The party chooses the lifeboat.'}]))!;
    expect(summary.entries[0].math).toBe('15 + 2 = 17 vs 10 + 3 = 13');
    expect(summary.entries[0].consequence).toContain('The boat is afloat');
    expect(summary.entries[1].kind).toBe('consequence');
  });
});

describe('authored inspection coverage', () => {
  for (const adventure of ADVENTURES) it(`${adventure.id}: all original and developed targets explain valid moves`, () => {
    adventure.chapters.forEach((chapter, index) => {
      const source = room([], {adventureId:adventure.id,adventureVersion:adventure.version,chapter:index});
      for (const flags of [[], [...chapter.targets.map(item=>`developed:${item.id}`),'mara-helped','tracks-read','gate-cleared','herd-calmed','boat-freed','reed-path','ferryman-spoke','ward-repaired','bell-rung','captives-guided']]) {
        const scene = getScene({...source,flags});
        expect(scene.situation).toBeTruthy();
        for (const target of scene.targets) {
          expect(target.context).toBeTruthy();
          for (const token of target.tokens) expect(target.actionCues?.[token],`${target.id}/${token}`).toBeTruthy();
        }
      }
      if(chapter.branch) for(const option of chapter.branch.options) {
        const scene=getScene({...source,storyBranch:option.id});
        expect(scene.situation).toBe(option.consequence);
        expect(scene.targets.find(target=>target.id===option.targetId)?.context).toContain(option.consequence);
      }
    });
  });
});
