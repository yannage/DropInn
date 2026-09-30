import { describe, expect, it } from 'vitest';
import { narratorCaptions, narratorCue, narratorVoice, captionDuration } from './narrator';
import type { AdventureRoom, StoryEvent } from './types';

const action: StoryEvent={id:'a',chapter:0,turn:1,at:1000,kind:'action',actorId:'hero',actorName:'Wren',text:'Wren studies the tracks.',contribution:true,success:true,result:{targetId:'tracks',targetKind:'scene',progress:2},change:{title:'A clue in the mud',text:'A silver ward fragment lies among the claw marks.',next:'Follow the trail.'}};
const room=(extra:Partial<AdventureRoom>={})=>({id:'room',phase:'choosing',chapter:0,turn:1,flags:[],events:[],outcomes:[],...extra} as AdventureRoom);
describe('storyteller cues',()=>{
  it('opens with authored scene prose and does not speak chat or temporary model narration',()=>{
    const cue=narratorCue(room());expect(cue.id).toBe('room:chapter:0');expect(cue.text).toContain('Mara');
  });
  it('names a real development once, with the same cue across the next choosing phase',()=>{
    const cue=narratorCue(room({phase:'reveal',events:[action]}));
    expect(cue.text).toBe('Wren: A clue in the mud. A silver ward fragment lies among the claw marks.');
    expect(narratorCue(room({turn:2,events:[action]}))).toEqual(cue);
  });
  it('does not narrate a development on a failed action and does not read numerical rewards',()=>{
    const cue=narratorCue(room({phase:'reveal',events:[{...action,success:false,text:'Wren finds a complication at the tracks.'}]}));
    expect(cue.text).toBe('Wren finds a complication at the tracks.');expect(cue.text).not.toContain('fragment');
  });
  it('uses the actual ending then replaces it with the new chapter on transition',()=>{
    const source=room({phase:'reveal',events:[action],outcomes:[{chapter:0,at:1000,result:'mixed',text:'The party reaches the river.'}]});
    expect(narratorCue(source).text).toBe('The party reaches the river.');
    expect(narratorCue({...source,chapter:1,turn:2,phase:'choosing'}).id).toBe('room:chapter:1');
  });
  it('gives a confirmed party choice priority over routine moves and developments',()=>{
    const decision: StoryEvent={id:'choice',chapter:0,turn:1,at:1000,kind:'consequence',text:'The party chooses the rescue route. The old ward must be left behind.'};
    const cue=narratorCue(room({phase:'reveal',events:[action,decision]}));
    expect(cue).toEqual({id:'room:0:1',text:decision.text});
    expect(narratorCue(room({turn:2,events:[decision,action]}))).toEqual(cue);
  });
  it('selects a meaningful human contribution instead of the first routine or companion action',()=>{
    const routine={...action,id:'routine',change:undefined,success:false,text:'Wren finds a complication at the tracks.'};
    const companion={...action,id:'companion',actorId:'companion-0',actorName:'Ash',text:'Ash helps the party.'};
    const protect: StoryEvent={...action,id:'protect',actorId:'departed',actorName:'Pip',change:undefined,text:'Pip protects Wren.',result:{targetKind:'hero',targetId:'hero',protection:3,progress:0}};
    const cue=narratorCue(room({phase:'reveal',events:[routine,companion,protect],seats:[],players:{}}));
    expect(cue.text).toBe('Pip protects Wren.');
    expect(narratorCue(room({turn:2,events:[routine,companion,protect],seats:[],players:{}}))).toEqual(cue);
  });
  it('narrates the actual blocked attack instead of an unrelated routine move or roll arithmetic',()=>{
    const routine={...action,change:undefined,effect:'Clash: 14 + 2 = 16. +3 progress. +5 XP.'};
    const blocked: StoryEvent={id:'blocked',chapter:0,turn:1,at:1000,kind:'consequence',actorId:'hero',actorName:'Wren',text:'Wren is protected from the danger by the party’s preparation.',result:{targetKind:'hero',targetId:'hero',damage:0,hp:10,protection:3}};
    expect(narratorCue(room({phase:'reveal',events:[routine,blocked]})).text).toBe(blocked.text);
  });
  it('keeps a short discovery and the most serious recorded human consequence together',()=>{
    const damage: StoryEvent={id:'damage',chapter:0,turn:1,at:1000,kind:'consequence',actorId:'hero',actorName:'Wren',text:'Wren takes 2 damage and can still Help while downed.',result:{targetKind:'hero',targetId:'hero',damage:2,hp:0}};
    const healed: StoryEvent={...damage,id:'healed',actorId:'second',actorName:'Pip',text:'Pip recovers 2 HP.',result:{targetKind:'hero',targetId:'second',healing:2,hp:5}};
    const cue=narratorCue(room({phase:'reveal',events:[action,healed,damage,damage]}));
    expect(cue.text).toBe(`Wren: A clue in the mud. A silver ward fragment lies among the claw marks. ${damage.text}`);
    expect(cue.text).not.toContain('Pip');
  });
  it('does not let an unconfirmed choosing turn leak a future discovery',()=>{
    expect(narratorCue(room({events:[action]}))).toEqual(narratorCue(room()));
  });
  it('splits readable subtitle passages without dropping or inventing words',()=>{
    const text='Mara is safe. The shadow pack watches the river while the party studies the markings on a silver fragment found in the muddy tracks.';
    const captions=narratorCaptions(text);
    expect(captions.join(' ')).toBe(text);expect(captions.every(line=>line.length<=88)).toBe(true);
    expect(narratorCaptions('')).toEqual([]);expect(captionDuration('A clue.')).toBe(3200);
  });
});
describe('browser storyteller voice',()=>{
  const voices=[{voiceURI:'system',name:'Default',lang:'fr-FR',default:true,localService:true},{voiceURI:'plain',name:'English',lang:'en-US',default:false,localService:true},{voiceURI:'natural',name:'English Natural',lang:'en-GB',default:false,localService:true}];
  it('respects the chosen voice before an automatic natural English voice',()=>{
    expect(narratorVoice(voices,'plain')?.voiceURI).toBe('plain');expect(narratorVoice(voices,'')?.voiceURI).toBe('natural');
  });
  it('handles delayed or missing voices and a saved voice from another device',()=>{
    expect(narratorVoice([],'gone')).toBeUndefined();expect(narratorVoice(voices.slice(0,1),'gone')).toBeUndefined();
  });
  it('never selects a remote or unverified voice, even from a saved preference',()=>{
    const remote = {voiceURI:'online',name:'English Natural Online',lang:'en-US',default:true,localService:false};
    expect(narratorVoice([remote,...voices],'online')?.voiceURI).toBe('natural');
    expect(narratorVoice([remote],'online')).toBeUndefined();
    expect(narratorVoice([{...remote,localService:undefined}],'online')).toBeUndefined();
  });
});
