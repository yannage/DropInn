import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {AccountSnapshot} from '../dropinn/accounts';
import {finishGuestRecovery,googleSignIn,hasGuestRecovery,returnToGuest,sendEmailCode} from './accountAuth';

const mocks=vi.hoisted(()=>({request:vi.fn(),getSession:vi.fn(),setSession:vi.fn(),updateUser:vi.fn(),linkIdentity:vi.fn()}));
vi.mock('../dropinn/api',()=>({adventureRequest:mocks.request}));
vi.mock('./client',()=>({requireSupabaseClient:()=>({auth:mocks})}));
const destination={id:'destination',guest:false} as AccountSnapshot;
beforeEach(()=>{
  Object.values(mocks).forEach(mock=>mock.mockReset());
  const values=new Map<string,string>();
  vi.stubGlobal('sessionStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});
  vi.stubGlobal('location',{origin:'http://localhost:5198'});
  mocks.getSession.mockResolvedValue({data:{session:{user:{id:'guest',is_anonymous:true},access_token:'source-access',refresh_token:'source-refresh'}}});
  mocks.request.mockResolvedValue({claimToken:'proof'});
  mocks.updateUser.mockResolvedValue({});mocks.setSession.mockResolvedValue({});
});
afterEach(()=>vi.unstubAllGlobals());
it('stops sign-in before changing identity if recovery storage is blocked',async()=>{
  vi.stubGlobal('sessionStorage',{getItem:()=>null,setItem:()=>{throw new Error('blocked');}});
  await expect(sendEmailCode('hero@example.com',false)).rejects.toThrow('blocking the storage');
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
it('retains recovery after an expired claim and can restore the source guest session',async()=>{
  await sendEmailCode('hero@example.com',false);
  mocks.request.mockRejectedValue(new Error('Recovery expired'));
  await expect(finishGuestRecovery(destination)).rejects.toThrow('Recovery expired');
  expect(hasGuestRecovery()).toBe(true);
  await returnToGuest();
  expect(mocks.setSession).toHaveBeenCalledWith({access_token:'source-access',refresh_token:'source-refresh'});
  expect(hasGuestRecovery()).toBe(false);
});
it('keeps recovery available when restoring the source session fails',async()=>{
  await sendEmailCode('hero@example.com',false);mocks.setSession.mockResolvedValue({error:new Error('Offline')});
  await expect(returnToGuest()).rejects.toThrow('Offline');expect(hasGuestRecovery()).toBe(true);
});
it('clears proof after a linked guest becomes permanent without transferring ownership',async()=>{
  await sendEmailCode('hero@example.com',false);mocks.request.mockClear();
  await finishGuestRecovery({...destination,id:'guest'});
  expect(mocks.request).not.toHaveBeenCalled();expect(hasGuestRecovery()).toBe(false);
});
it('clears proof only after successful existing-account recovery',async()=>{
  await sendEmailCode('hero@example.com',false);mocks.request.mockResolvedValue({account:destination});
  expect(await finishGuestRecovery(destination)).toEqual(destination);
  expect(mocks.request).toHaveBeenLastCalledWith({operation:'claim-redeem',claimToken:'proof'});
  expect(hasGuestRecovery()).toBe(false);
});
it('preserves the guest recovery route when Google linking fails',async()=>{
  mocks.linkIdentity.mockResolvedValue({error:new Error('Google cancelled')});
  await expect(googleSignIn(false)).rejects.toThrow('Google cancelled');expect(hasGuestRecovery()).toBe(true);
});
