import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { createCharacterProfile, CHARACTER_CLASS_PRESETS, heroAccent, sanitizeCharacterName, type CharacterProfile } from '../src/lib/character';
import { normalizeHero } from '../src/lib/cosmetics';
import { FREE_ACCOUNT_CAPABILITIES, type AccountSnapshot } from '../src/lib/dropinn/accounts';
import { HAT_STYLES, type CollectionSnapshot } from '../src/lib/dropinn/collection';

export class AccountError extends Error { constructor(message:string, public status=400){super(message);} }
const uuid=(value:unknown):value is string=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function checked(error:{code?:string;message?:string}|null) {
  if(!error) return;
  if(['PGRST202','42P01','42883','42501'].includes(error.code ?? '')) throw new AccountError('Account saving needs the 202609210001_accounts.sql database update. Your existing heroes are unchanged.',503);
  if(error.code==='P0001') throw new AccountError(error.message ?? 'Account update rejected.',409);
  throw new AccountError('Your account could not be saved or loaded. Please retry.',503);
}
function checkedCollection(data:unknown,error:{code?:string;message?:string}|null):CollectionSnapshot {
  if(error && ['PGRST202','42P01','42883','42501'].includes(error.code ?? '')) throw new AccountError('Collections need the 202609250001_collections.sql database update. Your existing heroes are unchanged.',503);
  checked(error);
  const value=data as CollectionSnapshot|null;
  if(!value || !Array.isArray(value.styles) || !Array.isArray(value.hats) || !Array.isArray(value.discoveries)
    || !Number.isSafeInteger(value.earned) || value.earned<0 || !Number.isSafeInteger(value.spent) || value.spent<0) throw new AccountError('Your collection could not be loaded. Please retry.',503);
  return value;
}
export async function loadCollection(db:SupabaseClient, accountId:string):Promise<CollectionSnapshot> {
  const {data,error}=await db.rpc('dropinn_collection',{p_account:accountId});
  return checkedCollection(data,error);
}
export function heroFromRow(row:Record<string,any>, collection?:CollectionSnapshot):CharacterProfile {
  const base=createCharacterProfile(row.name,row.class_key);
  return normalizeHero({...base,id:row.id,xp:row.xp,level:row.level,inventory:row.inventory ?? [],accent:heroAccent(row.accent,row.class_key),appearance:row.appearance,equipment:row.equipment,
    cosmeticUnlocks:collection ? {hats:collection.hats,styles:collection.styles} : undefined});
}
export function validatedHero(input:unknown, existing?:CharacterProfile):CharacterProfile {
  const value=input as Partial<CharacterProfile> | null;
  if(!value || !uuid(value.id) || !value.classKey || !Object.hasOwn(CHARACTER_CLASS_PRESETS,value.classKey)) throw new AccountError('Choose a valid hero.');
  const name=sanitizeCharacterName(typeof value.name==='string'?value.name:'');
  if(!name) throw new AccountError('Give your hero a name.');
  return normalizeHero({...createCharacterProfile(name,value.classKey),id:value.id,
    inventory:existing?.inventory ?? [],xp:existing?.xp ?? 240,level:existing?.level ?? 3,
    accent:heroAccent(value.accent,value.classKey),appearance:value.appearance,equipment:value.equipment,cosmeticUnlocks:existing?.cosmeticUnlocks});
}
export async function ownedPlayers(db:SupabaseClient, accountId:string):Promise<string[]> {
  const {data,error}=await db.from('player_ownership').select('player_id').eq('account_id',accountId);checked(error);
  if(!data?.length) throw new AccountError('Sign in to recover your hero, or reload to initialize your account.',401);
  // A migrated guest cannot act through an old anonymous session.
  const source=await db.from('player_ownership').select('account_id').eq('player_id',accountId).maybeSingle();checked(source.error);
  if(source.data && source.data.account_id!==accountId) throw new AccountError('This guest was recovered. Sign in to its account.',401);
  return data.map(row=>row.player_id);
}
export async function accountSnapshot(db:SupabaseClient,user:User,env:Record<string,string|undefined>):Promise<AccountSnapshot> {
  const bootstrap=await db.rpc('dropinn_bootstrap_account',{p_account:user.id,p_starter:normalizeHero(createCharacterProfile('Wren','wizard'))});checked(bootstrap.error);
  const players=await ownedPlayers(db,user.id);
  const collection=await loadCollection(db,user.id);
  const rows=await db.from('characters').select('*').in('user_id',players).order('created_at',{ascending:true});checked(rows.error);
  const profile=await db.from('player_accounts').select('selected_character_id').eq('account_id',user.id).single();checked(profile.error);
  const heroes=(rows.data ?? []).map(row=>({playerId:row.user_id,character:heroFromRow(row,collection)}));
  if(!heroes.length) throw new AccountError('Your saved hero could not be loaded. Please retry.',503);
  return {id:user.id,guest:user.is_anonymous===true,email:user.email,identities:user.identities?.map(identity=>identity.provider) ?? [],heroes,collection,
    selectedCharacterId:heroes.find(h=>h.character.id===profile.data?.selected_character_id)?.character.id ?? heroes[0].character.id,
    capabilities:FREE_ACCOUNT_CAPABILITIES,providers:{google:env.DROPINN_GOOGLE_AUTH_ENABLED==='1',email:env.DROPINN_EMAIL_AUTH_ENABLED==='1'}};
}
export async function handleAccount(db:SupabaseClient,user:User,body:{operation:string;character?:CharacterProfile;characterId?:string;claimToken?:string;recipeId?:string;commandId?:string},env:Record<string,string|undefined>) {
  if(body.operation==='account') return {account:await accountSnapshot(db,user,env)};
  const players=await ownedPlayers(db,user.id);
  if(body.operation==='collection') return {collection:await loadCollection(db,user.id)};
  if(body.operation==='craft') {
    if(!HAT_STYLES.some(style=>style.id===body.recipeId) || typeof body.commandId!=='string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.commandId)) throw new AccountError('Choose a valid style and crafting identifier.');
    const result=await db.rpc('dropinn_craft',{p_account:user.id,p_command_id:body.commandId,p_recipe_id:body.recipeId});
    return {collection:checkedCollection(result.data,result.error)};
  }
  if(body.operation==='hero-save' || body.operation==='hero-create') {
    const collection=await loadCollection(db,user.id);
    let existing:CharacterProfile|undefined;
    if(body.operation==='hero-save') {
      if(!uuid(body.character?.id)) throw new AccountError('Choose a valid hero.');
      const row=await db.from('characters').select('*').eq('id',body.character.id).in('user_id',players).maybeSingle();checked(row.error);
      if(!row.data) throw new AccountError('That hero is not available to your account.',403);
      existing=heroFromRow(row.data,collection);
    }
    const hero=validatedHero(body.character,existing);
    const result=await db.rpc('dropinn_save_hero',{p_account:user.id,p_hero:hero,p_create:body.operation==='hero-create'});checked(result.error);
    return {character:heroFromRow(result.data,collection)};
  }
  if(body.operation==='hero-select') {
    if(!uuid(body.characterId)) throw new AccountError('Choose a saved hero.');
    const result=await db.rpc('dropinn_select_hero',{p_account:user.id,p_character:body.characterId});checked(result.error);
    return {account:await accountSnapshot(db,user,env)};
  }
  if(body.operation==='claim-prepare') {
    if(!user.is_anonymous) throw new AccountError('Only a guest hero needs recovery.');
    const token=randomBytes(32).toString('base64url');
    const result=await db.from('player_claims').insert({token_hash:hash(token),player_id:user.id,expires_at:new Date(Date.now()+15*60_000).toISOString()});checked(result.error);
    return {claimToken:token};
  }
  if(body.operation==='claim-redeem') {
    if(user.is_anonymous) throw new AccountError('Finish signing in before recovering your hero.',401);
    if(typeof body.claimToken!=='string' || !/^[\w-]{43}$/.test(body.claimToken)) throw new AccountError('Recovery expired. Return to your guest browser and try again.');
    const result=await db.rpc('dropinn_redeem_claim',{p_account:user.id,p_hash:hash(body.claimToken)});checked(result.error);
    return {account:await accountSnapshot(db,user,env)};
  }
  throw new AccountError('Unknown account operation.');
}
