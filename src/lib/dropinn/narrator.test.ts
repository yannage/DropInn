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
  it('splits readable subtitle passages without dropping or inventing words',()=>{
    const text='Mara is safe. The shadow pack watches the river while the party studies the markings on a silver fragment found in the muddy tracks.';
    const captions=narratorCaptions(text);
    expect(captions.join(' ')).toBe(text);expect(captions.every(line=>line.length<=88)).toBe(true);
    expect(narratorCaptions('')).toEqual([]);expect(captionDuration('A clue.')).toBe(3200);
  });
});
describe('browser storyteller voice',()=>{
  const voices=[{voiceURI:'system',name:'Default',lang:'fr-FR',default:true},{voiceURI:'plain',name:'English',lang:'en-US',default:false},{voiceURI:'natural',name:'English Natural',lang:'en-GB',default:false}];
  it('respects the chosen voice before an automatic natural English voice',()=>{
    expect(narratorVoice(voices,'plain')?.voiceURI).toBe('plain');expect(narratorVoice(voices,'')?.voiceURI).toBe('natural');
  });
  it('handles delayed or missing voices and a saved voice from another device',()=>{
    expect(narratorVoice([],'gone')).toBeUndefined();expect(narratorVoice(voices.slice(0,1),'gone')?.voiceURI).toBe('system');
  });
});
