import type { Session } from '@supabase/supabase-js';
import { requireSupabaseClient } from './client';
import { adventureRequest } from '../dropinn/api';
import type { AccountSnapshot } from '../dropinn/accounts';

const namespace=import.meta.env.DEV && typeof window!=='undefined' ? new URLSearchParams(window.location.search).get('session') ?? '' : '';
const key=`dropinn-account-recovery-${namespace.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)}`;
interface Recovery { sourceId:string; token:string; session:Pick<Session,'access_token'|'refresh_token'> }
function read():Recovery|null {try{return JSON.parse(sessionStorage.getItem(key) ?? 'null');}catch{return null;}}
export function hasGuestRecovery(){return !!read();}
function clear(){sessionStorage.removeItem(key);}
async function prepare() {
  if(read()) return;
  const auth=requireSupabaseClient().auth;
  const {data,error}=await auth.getSession();if(error) throw error;
  if(!data.session?.user.is_anonymous) return;
  const result=await adventureRequest({operation:'claim-prepare'});
  if(!result.claimToken) throw new Error('Could not prepare guest recovery. Please retry.');
  try {sessionStorage.setItem(key,JSON.stringify({sourceId:data.session.user.id,token:result.claimToken,
    session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}} satisfies Recovery));}
  catch {throw new Error('This browser is blocking the storage needed for safe sign-in. Enable site storage and retry.');}
}
export async function finishGuestRecovery(account:AccountSnapshot):Promise<AccountSnapshot> {
  const recovery=read();
  if(!recovery || account.guest) return account;
  if(recovery.sourceId===account.id){clear();return account;}
  const result=await adventureRequest({operation:'claim-redeem',claimToken:recovery.token});
  if(!result.account) throw new Error('Guest recovery could not finish. Retry to keep both heroes.');
  clear();return result.account;
}
export async function returnToGuest() {
  const recovery=read();if(!recovery) return;
  const {error}=await requireSupabaseClient().auth.setSession(recovery.session);
  if(error) throw error;clear();
}
function callbackUrl() {
  const url=new URL('/',location.origin);
  if(import.meta.env.DEV && namespace) url.searchParams.set('session',namespace);
  return url.toString();
}
export async function googleSignIn(existing:boolean) {
  await prepare();
  const auth=requireSupabaseClient().auth;
  const {data}=await auth.getSession();
  const result=data.session && !existing
    ? await auth.linkIdentity({provider:'google',options:{redirectTo:callbackUrl()}})
    : await auth.signInWithOAuth({provider:'google',options:{redirectTo:callbackUrl()}});
  if(result.error) throw result.error;
}
export async function sendEmailCode(email:string,existing:boolean):Promise<'email'|'email_change'> {
  await prepare();
  const auth=requireSupabaseClient().auth;
  const {data}=await auth.getSession();
  if(data.session?.user.is_anonymous && !existing) {
    const {error}=await auth.updateUser({email});if(error) throw error;
    return 'email_change';
  }
  const {error}=await auth.signInWithOtp({email,options:{shouldCreateUser:false}});if(error) throw error;
  return 'email';
}
export async function verifyEmailCode(email:string,token:string,type:'email'|'email_change') {
  const {error}=await requireSupabaseClient().auth.verifyOtp({email,token,type});if(error) throw error;
}
