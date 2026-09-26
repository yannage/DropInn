import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { normalizeHero } from '../cosmetics';
import { createAdventure, reduceAdventure, getVisitRecap } from './engine';
import { getScene } from './scene';
import { HAT_STYLES, STARTER_PACK, chapterCredits, craftCollection, emptyCollection, mergeCollection, threadBalance } from './collection';

describe('First tales collection', () => {
  it.each(STARTER_PACK.adventures)('earns three credits through real play in %s, without spectator or duplicate credit', adventureId => {
    let room = createAdventure(createCharacterProfile('Wren','wizard'),'alice',1000,'TEST01',adventureId);
    for(let turns=0; room.status!=='completed' && turns<31; turns++) {
      const scene=getScene(room);
      const target=scene.targets.find(target=>target.tokens.includes('assist'))!;
      room=reduceAdventure(room,{id:crypto.randomUUID(),type:'act',userId:'alice',expectedTurn:room.turn,action:{token:'assist',targetId:target.id}},room.updatedAt+1);
      if(room.status!=='completed') room=reduceAdventure(room,{id:crypto.randomUUID(),type:'tick',userId:'alice'},room.revealUntil!);
    }
    expect(room.status).toBe('completed');
    expect(chapterCredits(room,'alice').map(credit=>credit.chapter)).toEqual([0,1,2]);
    expect(chapterCredits(room,'spectator')).toEqual([]);
    expect(getVisitRecap(reduceAdventure(room,{id:'final-tick',type:'tick',userId:'alice'},room.updatedAt+99999),'alice').collectionCredits).toHaveLength(3);
    delete room.collectionVersion;
    expect(chapterCredits(room,'alice')).toEqual([]);
  });
  it('preserves departed, failed and guaranteed contributions while excluding absent defense',()=>{
    const room=createAdventure(createCharacterProfile('Moss','fighter'),'alice',1000,'TEST01');
    room.players.alice.leftAt=1500;
    room.outcomes=[0,1,2].map(chapter=>({chapter,result:'setback',text:'The story continues.',at:2000}));
    room.events=[
      {id:'failed',kind:'action',chapter:0,turn:1,at:1100,actorId:'alice',text:'Tried.',roll:1,success:false},
      {id:'protect',kind:'action',chapter:1,turn:2,at:1200,actorId:'alice',text:'Protected.',contribution:true},
      {id:'away',kind:'action',chapter:2,turn:3,at:1300,actorId:'alice',text:'Away.',contribution:false},
    ];
    expect(chapterCredits(room,'alice').map(c=>c.chapter)).toEqual([0,1]);
  });
  it('spends once, keeps colors equally priced, and requires the base keepsake',()=>{
    expect(()=>craftCollection({...emptyCollection(),earned:10},'shepherd-blue')).toThrow('Earn');
    const start={...emptyCollection(),earned:3,hats:['shepherd']};
    const crafted=craftCollection(start,'shepherd-blue');
    expect(threadBalance(crafted)).toBe(0);
    expect(craftCollection(crafted,'shepherd-blue')).toEqual(crafted);
    expect(()=>craftCollection(crafted,'shepherd-red')).toThrow('3 Thread');
    expect(()=>craftCollection(start,'forged')).toThrow('available style');
    expect(new Set(HAT_STYLES.filter(s=>s.kind==='color').map(s=>s.cost))).toEqual(new Set([3]));
    const merged=mergeCollection(crafted,{...start,earned:4});
    expect(threadBalance(merged)).toBe(1);
    expect(merged.styles).toContain('shepherd-blue');
  });
  it('equips account-owned styles across heroes without changing power, and rejects forged/mismatched styles',()=>{
    const hero=createCharacterProfile('Wren','wizard');
    const shared=normalizeHero({...hero,cosmeticUnlocks:{hats:['shepherd'],styles:['shepherd-blue','shepherd-feather']},equipment:{hat:'shepherd',hatColor:'shepherd-blue',hatTrim:'shepherd-feather'}});
    expect(shared.inventory).toEqual([]);
    expect(shared.traits).toEqual(hero.traits);
    expect(shared.equipment).toEqual({hat:'shepherd',hatColor:'shepherd-blue',hatTrim:'shepherd-feather'});
    expect(normalizeHero({...shared,cosmeticUnlocks:undefined}).equipment).toEqual({hat:null,hatColor:null,hatTrim:null});
    expect(normalizeHero({...shared,equipment:{hat:'wizard',hatColor:'shepherd-blue',hatTrim:'shepherd-feather'}}).equipment).toEqual({hat:'wizard',hatColor:null,hatTrim:null});
  });
});
