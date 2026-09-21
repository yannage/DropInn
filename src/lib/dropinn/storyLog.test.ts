import { describe,it,expect } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure } from './engine';
import { storyEntries } from './storyLog';

describe('story log projection',()=>{
  it('deduplicates deliveries and existing endings without losing mechanics',()=>{
    const room=createAdventure(createCharacterProfile('Wren','wizard'),'alice',1000);
    room.events=room.events.filter(event=>event.kind==='chapter');
    const action={id:'move',kind:'action' as const,chapter:0,turn:1,at:1010,text:'Wren rescues Mara.',effect:'Two progress.',roll:12,modifier:3,success:true,change:{title:'Mara is safe',text:'Mara stands up.',next:'Follow her lead.'}};
    room.events.push(action,action,{id:'ending',kind:'chapter',chapter:0,turn:1,at:1020,text:'Everyone is safe.'});
    room.outcomes.push({chapter:0,result:'success',at:1020,text:'Everyone is safe.'});
    const entries=storyEntries(room);
    expect(entries).toHaveLength(3);
    expect(entries[1]).toMatchObject({text:'Mara is safe',details:['Wren rescues Mara.','Mara stands up.','Follow her lead.','Two progress.','Die 12 + 3 = 15 · Success']});
  });
  it('fills old outcome gaps, preserves chronology and never invents a Protect roll',()=>{
    const room=createAdventure(createCharacterProfile('Wren','wizard'),'alice',1000);
    room.events=room.events.filter(event=>event.kind==='chapter');
    room.events.push({id:'protect',kind:'action',chapter:0,turn:2,at:1100,text:'Wren protects Pip.',effect:'Blocks 3 damage.'});
    room.outcomes.push({chapter:0,result:'mixed',at:1200,text:'They reach the bank.'});
    const entries=storyEntries(room);
    expect(entries.map(e=>e.id)).toEqual([room.events[0].id,'protect','outcome:0']);
    expect(entries[1].details).toEqual(['Blocks 3 damage.']);
  });
});
