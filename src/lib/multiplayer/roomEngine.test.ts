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
        ...active.battleState,
        enemyHp: 4,
      },
    };

    const completed = commitRoomAction(weakened, hostSession, 'strike', now + 2);
    const view = buildRoomView(completed, hostSession, now + 3);

    expect(view.status).toBe('completed');
    expect(view.battleState.status).toBe('victory');
    expect(view.canClaimReward).toBe(true);
    expect(view.rewardXp).toBe(75);
  });
});

