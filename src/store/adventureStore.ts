import { create } from 'zustand';
import { createCharacterProfile, CHARACTER_CLASS_PRESETS, heroAccent, sanitizeCharacterName, type CharacterProfile, type CharacterClassKey } from '../lib/character';
import { AdventureRequestError, adventureRequest, localPlay, subscribeAdventure, type AdventureRequest, type AdventureResponse } from '../lib/dropinn/api';
import type { AdventureRoom, ChatMessage, CreativeProposal, PlayerAction, RoomSummary, VisitRecap, ReactionKind } from '../lib/dropinn/types';
import { getVisitRecap } from '../lib/dropinn/engine';
import { ensureAnonymousUser, requireSupabaseClient } from '../lib/supabase/client';
import { listSupabaseCharacters, updateSupabaseHeroIdentity } from '../lib/supabase/characters';
import { finishGuestRecovery } from '../lib/supabase/accountAuth';
import type { AccountSnapshot } from '../lib/dropinn/accounts';
import { getLevelForXp } from '../lib/progression';
import { parseInvitation } from '../lib/dropinn/invites';
import { normalizeHero, type HeroCustomization } from '../lib/cosmetics';
import { getErrorMessage } from '../lib/errors';

const namespace = (import.meta.env.DEV ? new URLSearchParams(window.location.search).get('session')?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) : undefined) || 'default';
const storageKey = `dropinn-v2-player-${namespace}`;
interface PendingAction {
  roomCode: string;
  turn: number;
  commandId: string;
  action: PlayerAction;
}
interface SavedPlayer {
  accountId?: string;
  userId: string;
  character: CharacterProfile;
  activeCode: string | null;
  receipts: Record<string, { xp: number; keepsakes: string[] }>;
  muted: string[];
  seenOutcomes?: Record<string, number>;
  pendingAction?: PendingAction | null;
}
function readSaved(): SavedPlayer {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (value?.character?.id && value?.userId) {
      const pending = value.pendingAction;
      const action = pending?.action;
      const validPending = pending?.roomCode === value.activeCode && typeof pending?.commandId === 'string'
        && Number.isInteger(pending?.turn) && typeof action?.targetId === 'string'
        && ['fight', 'influence', 'investigate', 'assist', 'spotlight'].includes(action?.token)
        && (action.targetKind === undefined || ['scene', 'hero'].includes(action.targetKind))
        && (action.releaseMs === undefined || (Number.isInteger(action.releaseMs) && action.releaseMs >= 0 && action.releaseMs <= 1200));
      return { receipts: {}, muted: [], activeCode: null, ...value, character: normalizeHero(value.character), pendingAction: validPending ? pending : null };
    }
  } catch { /* A damaged browser cache should never prevent joining. */ }
  // Retain an existing local hero when migrating from the original prototype.
  let previous: CharacterProfile | undefined;
  try {
    const old = JSON.parse(localStorage.getItem(namespace === 'default' ? 'dropinn-player-state' : `dropinn-player-state-${namespace}`) || 'null')?.state;
    previous = old?.characters?.find((hero: CharacterProfile) => hero.id === old.selectedCharacterId);
  } catch { /* Fresh visitor. */ }
  return { userId: crypto.randomUUID(), character: normalizeHero(previous || createCharacterProfile('Wren', 'wizard')), activeCode: null, receipts: {}, muted: [] };
}
let saved = readSaved();
let storageError:string|null=null;
const save = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved));
    if(saved.accountId) localStorage.setItem(`${storageKey}:${saved.accountId}`,JSON.stringify(saved));
    storageError=null;
  } catch {storageError='Site storage is unavailable. Keep this tab open and enable storage to save your browser progress.';}
};
save();
let initializePromise: Promise<void> | null = null;
let syncInFlight = false;
let listInFlight = false;
let unsubscribe: (() => void) | null = null;
let viewEpoch = 0;
let narrationKey = '';
let proposalSequence = 0;
const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => [...new Map([...current, ...incoming].map(message => [message.id, message])).values()]
  .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(-60);

interface AdventureState {
  account: AccountSnapshot | null;
  saveStatus: 'browser' | 'guest' | 'cloud' | 'saving' | 'failed';
  saveError: string | null;
  refreshAccount: () => Promise<void>;
  selectHero: (characterId:string) => Promise<void>;
  signOut: () => Promise<void>;
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
  pendingMove: { turn: number; action: PlayerAction } | null;
  narration: { text: string; catchUp: string; turn: number } | null;
  loading: boolean;
  proposing: boolean;
  reacting: boolean;
  skippingReveal: boolean;
  sendReaction: (reaction: ReactionKind) => Promise<void>;
  skipReveal: () => Promise<void>;
  error: string | null;
  syncError: string | null;
  syncing: boolean;
  restoringCode: string | null;
  mutedUserIds: string[];
  seenOutcomes: Record<string, number>;
  markRecapSeen: (recap: VisitRecap) => void;
  initialize: () => Promise<void>;
  refreshRooms: () => Promise<void>;
  playNow: (adventureId?: string) => Promise<void>;
  startFriendTable: (adventureId?: string) => Promise<void>;
  prepareAdventure: () => Promise<void>;
  joinRoom: (code: string, inviteKey?: string) => Promise<void>;
  syncRoom: () => Promise<void>;
  commitAction: (action: PlayerAction) => Promise<void>;
  leaveRoom: () => Promise<void>;
  propose: (idea: string, targetId: string) => Promise<void>;
  clearProposal: () => void;
  sendChat: (text: string) => Promise<boolean>;
  report: (userId: string, reason: string) => Promise<boolean>;
  toggleMute: (userId: string) => void;
  setHero: (name: string, classKey: CharacterClassKey, accent?: string, customization?: HeroCustomization) => Promise<void>;
  dismissRecap: () => void;
  clearError: () => void;
}

export const useAdventureStore = create<AdventureState>((set, get) => {
  const request = (payload: AdventureRequest) => adventureRequest({
    ...payload, sessionId: get().userId,
    character: localPlay ? get().character || undefined : undefined,
    characterId: get().character?.id,
  });
  const fail = (error: unknown) => set({ error: getErrorMessage(error, 'Something went wrong. Please retry.') });
  const setPendingAction = (pending: PendingAction | null) => {
    saved.pendingAction = pending;
    save();
    set({ pendingMove: pending ? { turn: pending.turn, action: pending.action } : null });
  };
  // Browser storage can outlive an anonymous auth session. Resolve ownership
  // before admission instead of submitting a hero from a previous account.
  const ensureHostedHero = async () => {
    if (localPlay) return;
    await ensureAnonymousUser();
    const response=await adventureRequest({operation:'account'});
    if(!response.account) throw new Error('Your account could not be loaded. Please retry.');
    const account=await finishGuestRecovery(response.account);
    const previousAccount=saved.accountId ?? saved.userId;
    const changed=previousAccount!==account.id;
    if(changed) {
      try {
        localStorage.setItem(`${storageKey}:${previousAccount}`,JSON.stringify(saved));
        const cached=JSON.parse(localStorage.getItem(`${storageKey}:${account.id}`) ?? 'null');
        saved={...saved,activeCode:cached?.activeCode ?? null,receipts:cached?.receipts ?? {},pendingAction:cached?.pendingAction ?? null};
      } catch {saved={...saved,activeCode:null,receipts:{},pendingAction:null};}
    }
    const selected=account.heroes.find(hero=>hero.character.id===account.selectedCharacterId) ?? account.heroes[0];
    if(!selected) throw new Error('Your hero could not be loaded. Please retry.');
    const character=selected.character;
    if (changed || saved.userId!==selected.playerId) {
      viewEpoch++;unsubscribe?.();unsubscribe=null;
      saved.activeCode = null;
      saved.receipts = {};
      saved.muted = [];
      saved.seenOutcomes = {};
      setPendingAction(null);
      set({ room:null, messages:[], proposal:null, narration:null, recaps: [], recap: null, mutedUserIds: [], seenOutcomes: {}, restoringCode: null, syncError: null });
    }
    saved.accountId=account.id;
    saved.userId = selected.playerId;
    saved.character = character;
    set({ userId: selected.playerId, character, account,saveStatus:account.guest?'guest':'cloud',saveError:null });
    save();
  };
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
    if (changed) {save();if(storageError)set({saveError:storageError,...(localPlay?{saveStatus:'failed' as const}:{})});}
  };
  const accept = async (response: AdventureResponse, epoch: number) => {
    if (epoch !== viewEpoch) return;
    const room = response.room;
    const current = get().room;
    if (!room || (current?.code === room.code && current.revision > room.revision)) return;
    const changedTurn = current?.turn !== room.turn;
    const pending = saved.pendingAction;
    if (pending && (pending.roomCode !== room.code || pending.turn !== room.turn || room.phase !== 'choosing'
      || room.status !== 'active' || room.commits[get().userId] || room.appliedCommands.includes(pending.commandId)
      || room.players[get().userId]?.leftAt !== null)) setPendingAction(null);
    if (changedTurn) proposalSequence++;
    set({ room, syncError: null, restoringCode: null, backend: response.backend, ...(response.messages ? { messages: mergeMessages(get().messages, response.messages) } : {}), ...(changedTurn ? { proposal: null, proposing: false, narration: null } : {}) });
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
  const enter = async (operation: 'play' | 'join', code?: string, variationId?: string, visibility?: 'private', inviteKey?: string, adventureId?: string) => {
    await ensureHostedHero();
    const epoch = ++viewEpoch;
    proposalSequence++;
    const response = await request({ operation, roomCode: code, variationId, visibility, inviteKey, adventureId });
    if (!response.room) throw new Error('This adventure could not be opened.');
    unsubscribe?.();
    set({ room: null, messages: [], recap: null, proposal: null, narration: null });
    saved.activeCode = response.room.code;
    save();
    await accept(response, epoch);
    unsubscribe = subscribeAdventure(response.room.code, () => { void get().syncRoom(); });
  };
  return {
    account:null,saveStatus:storageError?'failed':'browser',saveError:storageError,
    refreshAccount:async()=>{
      try {await ensureHostedHero();await get().refreshRooms();}
      catch(error){set({saveStatus:'failed',saveError:getErrorMessage(error,'Your account could not be loaded. Please retry.')});}
    },
    selectHero:id=>busy(async()=>{
      if(get().room || get().restoringCode || saved.pendingAction) throw new Error('Choose your hero between visits.');
      await adventureRequest({operation:'hero-select',characterId:id});
      await ensureHostedHero();await get().refreshRooms();
    }),
    signOut:()=>busy(async()=>{
      if(get().room || get().restoringCode || saved.pendingAction) throw new Error('Leave your table before signing out.');
      const {error}=await requireSupabaseClient().auth.signOut({scope:'local'});if(error) throw error;
      viewEpoch++;unsubscribe?.();unsubscribe=null;
      save();
      saved={userId:crypto.randomUUID(),character:createCharacterProfile('Wren','wizard'),activeCode:null,receipts:{},muted:[]};
      set({account:null,character:saved.character,userId:saved.userId,recaps:[],recap:null,saveStatus:'browser'});
      await ensureHostedHero();await get().refreshRooms();
    }),
    ready: false, backend: localPlay ? 'local' : 'supabase', userId: saved.userId, character: saved.character,
    rooms: [], room: null, messages: [], recaps: [], recap: null, proposal: null, narration: null,
    pendingMove: saved.pendingAction?.roomCode === saved.activeCode ? { turn: saved.pendingAction.turn, action: saved.pendingAction.action } : null,
    loading: false, proposing: false, reacting: false, skippingReveal: false, error: null, syncError: null, syncing: false, restoringCode: saved.activeCode, mutedUserIds: saved.muted,
    skipReveal: async () => {
      const room = get().room;
      const userId = get().userId;
      if (!room || room.status !== 'active' || room.phase !== 'reveal' || get().skippingReveal || room.revealSkips?.includes(userId)
        || !room.seats.some(seat => seat.kind === 'human' && !seat.leaving && seat.actorId === userId)) return;
      const epoch = viewEpoch;
      set({ skippingReveal: true });
      try {
        await accept(await request({ operation: 'command', roomCode: room.code, command: {
          id: crypto.randomUUID(), type: 'skip-reveal', userId, expectedTurn: room.turn,
        } }), epoch);
      } catch (error) {
        if (epoch === viewEpoch) {
          if (error instanceof AdventureRequestError && error.status === 409) void get().syncRoom();
          else fail(error);
        }
      } finally {
        if (epoch === viewEpoch) set({ skippingReveal: false });
      }
    },
    sendReaction: async reaction => {
      const room = get().room;
      if (!room || get().reacting) return;
      const epoch = viewEpoch;
      set({ reacting: true });
      try {
        await accept(await request({ operation: 'command', roomCode: room.code,
          command: { id: crypto.randomUUID(), type: 'react', userId: get().userId, reaction } }), epoch);
      } catch (error) { if (epoch === viewEpoch) fail(error); }
      finally { set({ reacting: false }); }
    },
    seenOutcomes: saved.seenOutcomes || {},
    markRecapSeen: recap => {
      const key = `${recap.code}:${recap.characterId}`;
      const previous = saved.seenOutcomes?.[key] ?? 0;
      if (previous >= recap.outcomes.length) return;
      saved.seenOutcomes = { ...saved.seenOutcomes, [key]: recap.outcomes.length };
      save();
      set({ seenOutcomes: saved.seenOutcomes });
    },
    initialize: () => {
      if (initializePromise) return initializePromise;
      initializePromise = (async () => {
        try {
          await ensureHostedHero();
          if (saved.activeCode) await get().syncRoom();
          if (!get().restoringCode) await get().refreshRooms();
        } catch (error) { fail(error);set({saveStatus:'failed',saveError:getErrorMessage(error,'Your hero could not be loaded.')}); }
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
    playNow: (adventureId) => busy(() => enter('play', undefined, undefined, undefined, undefined, adventureId)),
    startFriendTable: (adventureId) => busy(() => enter('play', undefined, undefined, 'private', undefined, adventureId)),
    prepareAdventure: () => busy(async () => {
      await ensureHostedHero();
      const response = await request({ operation: 'prepare' });
      await enter('play', undefined, response.variationId);
    }),
    joinRoom: (input, inviteKey) => busy(() => {
      const invitation = parseInvitation(input);
      return enter('join', invitation.code, undefined, undefined, inviteKey ?? invitation.inviteKey);
    }),
    syncRoom: async () => {
      const code = get().room?.code || get().restoringCode;
      if (!code || syncInFlight || get().loading) return;
      const epoch = viewEpoch;
      syncInFlight = true;
      set({ syncing: true });
      try {
        const restoring = !get().room;
        await accept(await request({ operation: 'read', roomCode: code }), epoch);
        if (epoch === viewEpoch && restoring && get().room?.code === code) {
          unsubscribe?.();
          unsubscribe = subscribeAdventure(code, () => { void get().syncRoom(); });
        }
      } catch (error) {
        if (epoch !== viewEpoch) return;
        if (error instanceof AdventureRequestError && [403, 404].includes(error.status)) {
          setPendingAction(null);
          saved.activeCode = null; save();
          unsubscribe?.(); unsubscribe = null;
          viewEpoch++;
          set({ room: null, restoringCode: null, syncError: null });
          fail(error);
        } else {
          set({ syncError: 'Updates interrupted. Reconnecting to your table...' });
        }
      } finally { syncInFlight = false; set({ syncing: false }); }
    },
    commitAction: action => busy(async () => {
      const room = get().room;
      if (!room) return;
      let pending = saved.pendingAction;
      if (pending && (pending.roomCode !== room.code || pending.turn !== room.turn)) { setPendingAction(null); pending = null; }
      if (pending && JSON.stringify(pending.action) !== JSON.stringify(action)) throw new Error('Your previous move is still being checked. Retry that move before choosing another.');
      if (!pending) {
        pending = { roomCode: room.code, turn: room.turn, commandId: crypto.randomUUID(), action: structuredClone(action) };
        setPendingAction(pending);
      }
      const epoch = viewEpoch;
      try {
        await accept(await request({ operation: 'command', roomCode: pending.roomCode, command: {
          id: pending.commandId, type: 'act', userId: get().userId, expectedTurn: pending.turn, expectedRevision: room.revision, action: pending.action,
        } }), epoch);
      } catch (error) {
        // A definite rejection is safe to edit. Network/5xx/rate-limit failures
        // retain the complete command, including release timing, across reload.
        if (error instanceof AdventureRequestError && [400, 401, 403, 404, 409, 422].includes(error.status)
          && saved.pendingAction?.commandId === pending.commandId) setPendingAction(null);
        throw error;
      }
      if (saved.pendingAction?.commandId === pending.commandId) setPendingAction(null);
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
      setPendingAction(null);
      saved.activeCode = null; save();
      set({ room: null, restoringCode: null, syncError: null, messages: [], proposal: null, narration: null, recap });
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
    setHero: (name, classKey, accent, customization) => busy(async () => {
      if (get().room || get().restoringCode) throw new Error('Change your hero between visits.');
      const current = get().character!;
      const preset = CHARACTER_CLASS_PRESETS[classKey];
      let character: CharacterProfile = normalizeHero({ ...current, ...customization, name: sanitizeCharacterName(name) || 'Wren', classKey, hp: preset.hp, maxHp: preset.hp, traits: preset.traits, accent: heroAccent(accent ?? current.accent, classKey) });
      set({saveStatus:'saving',saveError:null});
      try {if (!localPlay) character = await updateSupabaseHeroIdentity(get().userId, character);}
      catch(error){set({saveStatus:'failed',saveError:getErrorMessage(error,'Your hero could not be saved. Please retry.')});throw error;}
      // Reward responses may arrive while the identity write is in flight.
      const latest = get().character;
      if (latest?.id !== current.id) throw new Error('Your hero changed. Reopen the builder and try again.');
      character = normalizeHero({ ...character, xp: Math.max(character.xp, latest.xp), level: getLevelForXp(Math.max(character.xp, latest.xp)), inventory: [...new Set([...character.inventory, ...latest.inventory])] });
      saved.character = character; save(); set({ character });
      set({saveStatus:localPlay?(storageError?'failed':'browser'):get().account?.guest?'guest':'cloud',saveError:storageError});
    }),
    dismissRecap: () => set({ recap: null }),
    clearError: () => set({ error: null }),
  };
});
