import {beforeEach,expect,it,vi} from 'vitest';
import {createCharacterProfile} from '../character';
import {listSupabaseCharacters,upsertSupabaseCharacter,updateSupabaseHeroIdentity} from './characters';
const mocks=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../dropinn/api',()=>({adventureRequest:mocks.request}));
beforeEach(()=>{mocks.request.mockReset();});
it('loads owned heroes through the account service without a client owner filter',async()=>{
 const hero=createCharacterProfile('Ash','wizard');mocks.request.mockResolvedValue({account:{heroes:[{playerId:'historical',character:hero}]}});
 expect(await listSupabaseCharacters('account')).toEqual([hero]);expect(mocks.request).toHaveBeenCalledWith({operation:'account'});
});
it.each([upsertSupabaseCharacter,updateSupabaseHeroIdentity])('never uploads rewards through a shared builder save',async save=>{
 const hero={...createCharacterProfile('Ash','wizard'),xp:9999,inventory:['Forged']};mocks.request.mockImplementation(async p=>p.operation==='account'?{account:{heroes:[]}}:{character:{...hero,xp:250,inventory:[]}});
 const result=await save('forged-owner',hero);const payload=mocks.request.mock.calls.find(call=>call[0].character)![0];
 expect(payload.character).not.toHaveProperty('xp');expect(payload.character).not.toHaveProperty('inventory');expect(payload).not.toHaveProperty('userId');expect(result.xp).toBe(250);
});
it('routes legacy edits of an existing hero to the identity-only save',async()=>{
 const hero=createCharacterProfile('Ash','wizard');mocks.request.mockImplementation(async p=>p.operation==='account'?{account:{heroes:[{character:hero}]}}:{character:{...hero,name:'Moss',xp:350}});
 expect((await upsertSupabaseCharacter('owner',{...hero,name:'Moss'})).xp).toBe(350);
 expect(mocks.request.mock.calls.map(call=>call[0].operation)).toEqual(['account','hero-save']);
});
it('preserves actionable migration failures instead of reporting a successful save',async()=>{
 mocks.request.mockRejectedValue(new Error('Account saving needs the 202609210001_accounts.sql database update.'));
 await expect(updateSupabaseHeroIdentity('owner',createCharacterProfile('Ash','wizard'))).rejects.toThrow('202609210001_accounts.sql');
});
