import type { CharacterProfile } from '../character';
import { adventureRequest } from '../dropinn/api';

/** Shared by both builders: identity is verified by the endpoint, never its payload. */
export async function listSupabaseCharacters(_userId:string) {
  const response=await adventureRequest({operation:'account'});
  if(!response.account) throw new Error('Your saved heroes could not be loaded.');
  return response.account.heroes.map(hero=>hero.character);
}
function identity(character:CharacterProfile):CharacterProfile {
  return {id:character.id,name:character.name,classKey:character.classKey,accent:character.accent,
    appearance:character.appearance,equipment:character.equipment} as CharacterProfile;
}
export async function upsertSupabaseCharacter(_userId:string,character:CharacterProfile) {
  const heroes=await listSupabaseCharacters(_userId);
  if(heroes.some(hero=>hero.id===character.id)) return updateSupabaseHeroIdentity(_userId,character);
  const response=await adventureRequest({operation:'hero-create',character:identity(character)});
  if(!response.character) throw new Error('Your hero could not be saved. Please retry.');
  return response.character;
}
export async function updateSupabaseHeroIdentity(_userId:string,character:CharacterProfile) {
  const response=await adventureRequest({operation:'hero-save',character:identity(character)});
  if(!response.character) throw new Error('Your hero could not be saved. Please retry.');
  return response.character;
}
