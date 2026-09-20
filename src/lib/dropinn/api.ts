import { getSupabaseClient } from '../supabase/client';
import type { AdventureCommand, AdventureRoom, ChatMessage, CreativeProposal, RoomSummary, VisitRecap } from './types';
import type { CharacterProfile } from '../character';

export const localPlay = import.meta.env.DEV && import.meta.env.VITE_DROPINN_BACKEND !== 'supabase';
export interface AdventureResponse {
  backend: 'local' | 'supabase';
  room?: AdventureRoom;
  rooms?: RoomSummary[];
  messages?: ChatMessage[];
  recaps?: VisitRecap[];
  proposal?: CreativeProposal;
  variationId?: string;
  narration?: string;
  catchUp?: string;
  turn?: number;
  error?: string;
}
export interface AdventureRequest {
  adventureId?: string;
  visibility?: 'public' | 'private';
  inviteKey?: string;
  operation: 'list' | 'play' | 'join' | 'read' | 'command' | 'propose' | 'chat' | 'report' | 'history' | 'prepare' | 'narrate';
  roomCode?: string;
  command?: AdventureCommand;
  characterId?: string;
  character?: CharacterProfile;
  sessionId?: string;
  idea?: string;
  targetId?: string;
  text?: string;
  reportedUserId?: string;
  reason?: string;
  variationId?: string;
}

export class AdventureRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function adventureRequest(payload: AdventureRequest): Promise<AdventureResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!localPlay) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Online adventures are not configured on this host yet.');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Your session expired. Reload to reconnect.');
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const abort = new AbortController();
  const timeout = window.setTimeout(() => abort.abort(), 12_000);
  try {
    const response = await fetch('/api/dropinn', { method: 'POST', headers, body: JSON.stringify(payload), signal: abort.signal });
    const text = await response.text();
    let result: AdventureResponse;
    try { result = JSON.parse(text); }
    catch { throw new Error('The adventure server is unavailable. Start the development server or check deployment setup.'); }
    if (!response.ok || result.error) throw new AdventureRequestError(result.error || 'Unable to reach the adventure. Please retry.', response.status);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Connection took too long. Your action can be safely retried.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}

export function subscribeAdventure(code: string, onUpdate: () => void): () => void {
  if (localPlay) return () => {};
  const client = getSupabaseClient();
  if (!client) return () => {};
  const channel = client.channel(`dropinn-v2:${code}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'adventure_rooms', filter: `code=eq.${code}` }, onUpdate)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
