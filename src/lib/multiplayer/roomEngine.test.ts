import { describe, expect, it } from 'vitest';
import type { CharacterProfile } from '../character';
import {
  buildRoomView,
  commitRoomAction,
  createRoomState,
  startRoomState,
  touchParticipant,
} from './roomEngine';

const makeCharacter = (id: string, name: string): CharacterProfile => ({
  id,
  name,
  classKey: 'fighter',
  level: 3,
  xp: 240,
  hp: 14,
  maxHp: 14,
  traits: { INT: 20, ATH: 20, ING: 20, CHA: 20 },
  spotlightTokens: 2,
  inventory: [],
  accent: '#6EE7B7',
});

describe('multiplayer room engine', () => {
  it('prevents duplicate commits before a turn resolves', () => {
    const host = makeCharacter('host-char', 'Host');
    const guest = makeCharacter('guest-char', 'Guest');
    const hostSession = 'host-user';
    const guestSession = 'guest-user';
    const now = 1000;

    const created = createRoomState(host, hostSession, now);
    const joined = touchParticipant(created, guestSession, guest, now + 1);
    const active = startRoomState(joined, hostSession, now + 2);

    const firstCommit = commitRoomAction(active, hostSession, 'strike', now + 3);
    const duplicateCommit = commitRoomAction(firstCommit, hostSession, 'heavy', now + 4);

    expect(duplicateCommit.actionCommits[hostSession].actionId).toBe('strike');
    expect(duplicateCommit.status).toBe('active');
  });

  it('builds a completed victory view with a claimable reward', () => {
    const host = makeCharacter('host-char', 'Host');
    const hostSession = 'host-user';
    const now = 1000;
    const created = createRoomState(host, hostSession, now);
    const active = startRoomState(created, hostSession, now + 1);
    const weakened = {
      ...active,
      battleState: {
        ...active.battleState!,
        enemyHp: 4,
      },
    };

    const completed = commitRoomAction(weakened, hostSession, 'strike', now + 2);
    const view = buildRoomView(completed, hostSession, now + 3);

    expect(view.status).toBe('completed');
    expect(view.battleState?.status).toBe('victory');
    expect(view.canClaimReward).toBe(true);
    expect(view.rewardXp).toBe(75);
  });

  it('resolves story room votes by majority and advances the scene', () => {
    const host = makeCharacter('host-char', 'Host');
    const guest = makeCharacter('guest-char', 'Guest');
    const hostSession = 'host-user';
    const guestSession = 'guest-user';
    const now = 1000;

    const created = createRoomState(host, hostSession, now, 'story');
    const joined = touchParticipant(created, guestSession, guest, now + 1);
    const active = startRoomState(joined, hostSession, now + 2);
    const hostVote = commitRoomAction(active, hostSession, 'visit_inn', now + 3);
    const resolved = commitRoomAction(hostVote, guestSession, 'visit_inn', now + 4);

    expect(resolved.storyArcState?.sceneId).toBe('inn_scene');
    expect(resolved.currentStoryText).toContain('Crooked Tankard');
    expect(resolved.actionCommits).toEqual({});
  });

  it('respawns story parties at the checkpoint after a wipe and tracks the penalty', () => {
    const host = makeCharacter('host-char', 'Host');
    const hostSession = 'host-user';
    const now = 1000;

    const created = createRoomState(host, hostSession, now, 'story');
    const active = startRoomState(created, hostSession, now + 1);
    const doomed = {
      ...active,
      sceneRound: 2,
      turn: 3,
      currentStoryText: 'The reeds split and the lesser pack closes in.',
      storyArcState: {
        ...active.storyArcState!,
        sceneId: 'pack_battle' as const,
        checkpointSceneId: 'hunt_choice' as const,
        battleState: {
          status: 'active' as const,
          round: 1,
          enemyName: 'Reedfang Pack',
          enemyHp: 18,
          enemyMaxHp: 18,
          enemyIntent: 'Slash every hero for 5 damage.',
          partyHpByCharacterId: {
            [host.id]: 1,
          },
          downedCharacterIds: [],
          lastResolvedTurn: null,
          rewardClaimedByCharacterId: {},
        },
      },
    };

    const wiped = commitRoomAction(doomed, hostSession, 'heavy', now + 2);

    expect(wiped.status).toBe('active');
    expect(wiped.storyArcState?.sceneId).toBe('hunt_choice');
    expect(wiped.storyArcState?.battleState).toBeNull();
    expect(wiped.storyArcState?.setbackCount).toBe(1);
    expect(wiped.storyArcState?.xpPenalty).toBe(40);
    expect(wiped.currentStoryText).toContain('wakes in Briar Glen');
  });
});
