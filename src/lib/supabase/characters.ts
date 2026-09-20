import {
  CHARACTER_CLASS_PRESETS,
  type CharacterClassKey,
  type CharacterProfile,
  type TraitSet,
} from '../character';
import { requireSupabaseClient } from './client';
import { normalizeHero, type HeroAppearance, type HeroEquipment } from '../cosmetics';
import { getErrorMessage } from '../errors';

/** PostgREST errors are plain objects, and schema drift needs an actionable diagnosis. */
function characterError(error: unknown): Error {
  const message = getErrorMessage(error, 'Your hero could not be saved. Please retry.');
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if ((code === 'PGRST204' || code === '42703') && /\b(appearance|equipment)\b/i.test(message)) {
    return new Error('The character builder database update is missing. Apply 202609200001_hero_customization.sql in Supabase, then reload. Your existing hero and rewards are unchanged.');
  }
  return new Error(message);
}

interface CharacterRow {
  id: string;
  user_id: string;
  name: string;
  class_key: CharacterClassKey;
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  traits: TraitSet;
  spotlight_tokens: number;
  inventory: string[];
  accent: string | null;
  appearance?: HeroAppearance;
  equipment?: HeroEquipment;
}

const fromRow = (row: CharacterRow): CharacterProfile => normalizeHero({
  id: row.id,
  name: row.name,
  classKey: row.class_key,
  level: row.level,
  xp: row.xp,
  hp: row.hp,
  maxHp: row.max_hp,
  traits: row.traits,
  spotlightTokens: row.spotlight_tokens,
  inventory: row.inventory ?? [],
  accent: row.accent ?? CHARACTER_CLASS_PRESETS[row.class_key].accent,
  appearance: row.appearance,
  equipment: row.equipment,
});

const toRow = (character: CharacterProfile, userId: string) => ({
  id: character.id,
  user_id: userId,
  name: character.name,
  class_key: character.classKey,
  level: character.level,
  xp: character.xp,
  hp: character.hp,
  max_hp: character.maxHp,
  traits: character.traits,
  spotlight_tokens: character.spotlightTokens,
  inventory: character.inventory,
  accent: character.accent,
  appearance: normalizeHero(character).appearance,
  equipment: normalizeHero(character).equipment,
  updated_at: new Date().toISOString(),
});

export const listSupabaseCharacters = async (userId: string) => {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw characterError(error);
  return ((data ?? []) as CharacterRow[]).map(fromRow);
};

export const upsertSupabaseCharacter = async (
  userId: string,
  character: CharacterProfile,
) => {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from('characters')
    .upsert(toRow(character, userId), { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw characterError(error);
  return fromRow(data as CharacterRow);
};

/** Identity edits must never overwrite rewards awarded concurrently by the server. */
export const updateSupabaseHeroIdentity = async (userId: string, character: CharacterProfile) => {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from('characters').update({
    name: character.name,
    class_key: character.classKey,
    hp: character.hp,
    max_hp: character.maxHp,
    traits: character.traits,
    accent: character.accent,
    appearance: normalizeHero(character).appearance,
    equipment: normalizeHero(character).equipment,
    updated_at: new Date().toISOString(),
  }).eq('id', character.id).eq('user_id', userId).select('*').single();
  if (error) throw characterError(error);
  return fromRow(data as CharacterRow);
};
