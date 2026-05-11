import {
  CHARACTER_CLASS_PRESETS,
  type CharacterClassKey,
  type CharacterProfile,
  type TraitSet,
} from '../character';
import { requireSupabaseClient } from './client';

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
}

const fromRow = (row: CharacterRow): CharacterProfile => ({
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
  updated_at: new Date().toISOString(),
});

export const listSupabaseCharacters = async (userId: string) => {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
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

  if (error) throw error;
  return fromRow(data as CharacterRow);
};

