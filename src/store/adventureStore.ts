import { create } from 'zustand';
import { createCharacterProfile, CHARACTER_CLASS_PRESETS, sanitizeCharacterName, type CharacterProfile, type CharacterClassKey } from '../lib/character';
import { adventureRequest, localPlay, subscribeAdventure, type AdventureRequest, type AdventureResponse } from '../lib/dropinn/api';
import type { AdventureRoom, ChatMessage, CreativeProposal, PlayerAction, RoomSummary, VisitRecap } from '../lib/dropinn/types';
import { getVisitRecap } from '../lib/dropinn/engine';
import { ensureAnonymousUser } from '../lib/supabase/client';
import { listSupabaseCharacters, upsertSupabaseCharacter, updateSupabaseHeroIdentity } from '../lib/supabase/characters';
import { getLevelForXp } from '../lib/progression';

const namespace = new URLSearchParams(window.location.search).get('session')?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'default';
const storageKey = `dropinn-v2-player-${namespace}`;
interface SavedPlayer {
  userId: string;
  character: CharacterProfile;
  activeCode: string | null;
  receipts: Record<string, { xp: number; keepsakes: string[] }>;
  muted: string[];
}
function readSaved(): SavedPlayer {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (value?.character?.id && value?.userId) return { receipts: {}, muted: [], activeCode: null, ...value };
  } catch { /* A damaged browser cache should never prevent joining. */ }
  // Retain an existing local hero when migrating from the original prototype.
  let previous: CharacterProfile | undefined;
  try {
    const old = JSON.parse(localStorage.getItem(namespace === 'default' ? 'dropinn-player-state' : `dropinn-player-state-${namespace}`) || 'null')?.state;
    previous = old?.characters?.find((hero: CharacterProfile) => hero.id === old.selectedCharacterId);
  } catch { /* Fresh visitor. */ }
  return { userId: crypto.randomUUID(), character: previous || createCharacterProfile('Wren', 'wizard'), activeCode: null, receipts: {}, muted: [] };
}
let saved = readSaved();
const save = () => localStorage.setItem(storageKey, JSON.stringify(saved));
save();
let initializePromise: Promise<void> | null = null;
let syncInFlight = false;
let listInFlight = false;
let unsubscribe: (() => void) | null = null;
let viewEpoch = 0;
let narrationKey = '';
let proposalSequence = 0;
let pendingAction: { key: string; commandId: string } | null = null;
const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => [...new Map([...current, ...incoming].map(message => [message.id, message])).values()]
  .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(-60);

interface AdventureState {
  ready: boolean;
  backend: 'local' | 'supabase';
  userId: string;
  character: CharacterProfile | null;
  rooms: RoomSummary[];
  room: AdventureRoom | null;
  messages: ChatMessage[];
  recaps: VisitRecap[];
  recap: VisitRecap | null;
  proposal: CreativeProposal | null;
  narration: { text: string; catchUp: string; turn: number } | null;
  loading: boolean;
  proposing: boolean;
  error: string | null;
  mutedUserIds: string[];
  initialize: () => Promise<void>;
  refreshRooms: () => Promise<void>;
  playNow: () => Promise<void>;
  prepareAdventure: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  syncRoom: () => Promise<void>;
  commitAction: (action: PlayerAction) => Promise<void>;
  leaveRoom: () => Promise<void>;
  propose: (idea: string, targetId: string) => Promise<void>;
  clearProposal: () => void;
  sendChat: (text: string) => Promise<boolean>;
  report: (userId: string, reason: string) => Promise<boolean>;
  toggleMute: (userId: string) => void;
  setHero: (name: string, classKey: CharacterClassKey) => Promise<void>;
  dismissRecap: () => void;
  clearError: () => void;
}

export const useAdventureStore = create<AdventureState>((set, get) => {
  const request = (payload: AdventureRequest) => adventureRequest({
    ...payload, sessionId: get().userId,
    character: localPlay ? get().character || undefined : undefined,
    characterId: get().character?.id,
  });
  const fail = (error: unknown) => set({ error: error instanceof Error ? error.message : 'Something went wrong. Please retry.' });
  const busy = async (run: () => Promise<void>) => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try { await run(); } catch (error) { fail(error); }
    finally { set({ loading: false }); }
  };
  const collectReceipts = async (recaps: VisitRecap[], refreshHero = false) => {
    let changed = false;
    for (const recap of recaps) {
      if (recap.characterId !== get().character?.id) continue;
      const key = `${recap.code}:${recap.characterId}`;
      const previous = saved.receipts[key] || { xp: 0, keepsakes: [] };
      if (recap.xp <= previous.xp && recap.keepsakes.every(item => previous.keepsakes.includes(item))) continue;
      if (localPlay) {
        const character = get().character!;
        const xp = character.xp + Math.max(0, recap.xp - previous.xp);
        const updated = { ...character, xp, level: getLevelForXp(xp), inventory: [...new Set([...character.inventory, ...recap.keepsakes])] };
        saved.character = updated;
        set({ character: updated });
      }
      saved.receipts[key] = { xp: Math.max(recap.xp, previous.xp), keepsakes: [...new Set([...previous.keepsakes, ...recap.keepsakes])] };
      changed = true;
    }
    if ((changed || refreshHero) && !localPlay) {
      const heroes = await listSupabaseCharacters(get().userId);
      const updated = heroes.find(hero => hero.id === get().character?.id);
      const current = get().character;
      if (updated && current && updated.xp >= current.xp) {
        // A reward refresh never reverts a concurrent name/class edit or newer reward.
        const character = { ...current, xp: updated.xp, level: updated.level, inventory: [...new Set([...current.inventory, ...updated.inventory])] };
        saved.character = character;
        set({ character });
        changed = true;
      }
    }
    if (changed) save();
  };
  const accept = async (response: AdventureResponse, epoch: number) => {
    if (epoch !== viewEpoch) return;
    const room = response.room;
    const current = get().room;
    if (!room || (current?.code === room.code && current.revision > room.revision)) return;
    const changedTurn = current?.turn !== room.turn;
    if (changedTurn) proposalSequence++;
    set({ room, backend: response.backend, ...(response.messages ? { messages: mergeMessages(get().messages, response.messages) } : {}), ...(changedTurn ? { proposal: null, proposing: false, narration: null } : {}) });
    const participant = room.players[get().userId];
    if (participant) await collectReceipts([getVisitRecap(room, get().userId)]);
    if (room.phase === 'reveal' && narrationKey !== `${room.code}:${room.turn}`) {
      narrationKey = `${room.code}:${room.turn}`;
      void request({ operation: 'narrate', roomCode: room.code }).then(result => {
        if (viewEpoch === epoch && get().room?.code === room.code && get().room?.turn === room.turn && result.narration) {
          set({ narration: { text: result.narration, catchUp: result.catchUp || '', turn: room.turn } });
        }
      }).catch(() => { /* Authored result is already visible. */ });
    }
  };
  const enter = async (operation: 'play' | 'join', code?: string, variationId?: string) => {
    const epoch = ++viewEpoch;
    proposalSequence++;
    const response = await request({ operation, roomCode: code, variationId });
    if (!response.room) throw new Error('This adventure could not be opened.');
    unsubscribe?.();
    set({ room: null, messages: [], recap: null, proposal: null, narration: null });
    saved.activeCode = response.room.code;
    save();
    await accept(response, epoch);
    unsubscribe = subscribeAdventure(response.room.code, () => { void get().syncRoom(); });
  };
  return {
    ready: false, backend: localPlay ? 'local' : 'supabase', userId: saved.userId, character: saved.character,
    rooms: [], room: null, messages: [], recaps: [], recap: null, proposal: null, narration: null,
    loading: false, proposing: false, error: null, mutedUserIds: saved.muted,
    initialize: () => {
      if (initializePromise) return initializePromise;
      initializePromise = (async () => {
        try {
          if (!localPlay) {
            const user = await ensureAnonymousUser();
            if (!user) throw new Error('Online adventures are not configured yet.');
            const characters = await listSupabaseCharacters(user.id);
            const character = characters.find(hero => hero.id === saved.character.id) || characters[0]
              || await upsertSupabaseCharacter(user.id, createCharacterProfile('Wren', 'wizard'));
            saved.userId = user.id;
            saved.character = character;
            set({ userId: user.id, character });
            save();
          }
          if (saved.activeCode) {
            try {
              const response = await request({ operation: 'read', roomCode: saved.activeCode });
              await accept(response, viewEpoch);
              if (response.room) unsubscribe = subscribeAdventure(response.room.code, () => { void get().syncRoom(); });
            } catch { saved.activeCode = null; save(); }
          }
          await get().refreshRooms();
        } catch (error) { fail(error); }
        finally { set({ ready: true }); }
      })();
      return initializePromise;
    },
    refreshRooms: async () => {
      if (listInFlight) return;
      listInFlight = true;
      try {
        const [listing, history] = await Promise.all([request({ operation: 'list' }), request({ operation: 'history' })]);
        await collectReceipts(history.recaps || [], true);
        set({ rooms: listing.rooms || [], recaps: history.recaps || [], backend: listing.backend });
      } catch (error) { fail(error); }
      finally { listInFlight = false; }
    },
    playNow: () => busy(() => enter('play')),
    prepareAdventure: () => busy(async () => {
      const response = await request({ operation: 'prepare' });
      await enter('play', undefined, response.variationId);
    }),
    joinRoom: code => busy(() => enter('join', code.trim().toUpperCase())),
    syncRoom: async () => {
      const code = get().room?.code;
      if (!code || syncInFlight || get().loading) return;
      const epoch = viewEpoch;
      syncInFlight = true;
      try { await accept(await request({ operation: 'read', roomCode: code }), epoch); }
      catch (error) { fail(error); }
      finally { syncInFlight = false; }
    },
    commitAction: action => busy(async () => {
      const room = get().room;
      if (!room) return;
      const key = `${room.code}:${room.turn}:${JSON.stringify(action)}`;
      if (pendingAction?.key !== key) pendingAction = { key, commandId: crypto.randomUUID() };
      await accept(await request({ operation: 'command', roomCode: room.code, command: {
        id: pendingAction.commandId, type: 'act', userId: get().userId, expectedTurn: room.turn, expectedRevision: room.revision, action,
      } }), viewEpoch);
      pendingAction = null;
      set({ proposal: null });
    }),
    leaveRoom: () => busy(async () => {
      const room = get().room;
      if (!room) return;
      const response = await request({ operation: 'command', roomCode: room.code, command: { id: crypto.randomUUID(), type: 'leave', userId: get().userId } });
      await accept(response, viewEpoch);
      const recap = getVisitRecap(response.room || room, get().userId);
      viewEpoch += 1;
      proposalSequence++;
      unsubscribe?.(); unsubscribe = null;
      saved.activeCode = null; save();
      set({ room: null, messages: [], proposal: null, narration: null, recap });
      await get().refreshRooms();
    }),
    propose: async (idea, targetId) => {
      const room = get().room;
      if (!room || get().proposing) return;
      const epoch = viewEpoch;
      const sequence = ++proposalSequence;
      set({ proposing: true, proposal: null, error: null });
      try {
        const response = await request({ operation: 'propose', roomCode: room.code, idea, targetId });
        if (sequence !== proposalSequence) return;
        if (viewEpoch === epoch && get().room?.turn === room.turn) set({ proposal: response.proposal || null });
        else set({ error: 'The scene moved on. Try your idea in this turn.' });
      } catch (error) { if (sequence === proposalSequence) fail(error); }
      finally { if (sequence === proposalSequence) set({ proposing: false }); }
    },
    clearProposal: () => { proposalSequence++; set({ proposal: null, proposing: false }); },
    sendChat: async text => {
      const room = get().room;
      if (!room) return false;
      try {
        const result = await request({ operation: 'chat', roomCode: room.code, text });
        if (get().room?.code === room.code) set({ messages: mergeMessages(get().messages, result.messages || []) });
        return true;
      } catch (error) { fail(error); return false; }
    },
    report: async (reportedUserId, reason) => {
      const room = get().room;
      if (!room) return false;
      try { await request({ operation: 'report', roomCode: room.code, reportedUserId, reason }); return true; }
      catch (error) { fail(error); return false; }
    },
    toggleMute: userId => {
      const muted = get().mutedUserIds.includes(userId) ? get().mutedUserIds.filter(id => id !== userId) : [...get().mutedUserIds, userId];
      saved.muted = muted; save(); set({ mutedUserIds: muted });
    },
    setHero: (name, classKey) => busy(async () => {
      if (get().room) throw new Error('Change your hero between visits.');
      const current = get().character!;
      const preset = CHARACTER_CLASS_PRESETS[classKey];
      let character = { ...current, name: sanitizeCharacterName(name) || 'Wren', classKey, hp: preset.hp, maxHp: preset.hp, traits: preset.traits, accent: preset.accent };
      if (!localPlay) character = await updateSupabaseHeroIdentity(get().userId, character);
      saved.character = character; save(); set({ character });
    }),
    dismissRecap: () => set({ recap: null }),
    clearError: () => set({ error: null }),
  };
});
