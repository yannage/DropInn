import type { CharacterClassKey, CharacterProfile, TraitSet } from '../character';

export type BattleActionId = 'strike' | 'heavy' | 'guard' | 'aid';
export type BattleStatus = 'lobby' | 'active' | 'victory' | 'failure';

export interface BattleActionDefinition {
  id: BattleActionId;
  label: string;
  trait: keyof TraitSet;
  dc: number;
  description: string;
  successDamage?: number;
  failureDamage?: number;
  guardReduction?: number;
  heal?: number;
}

export interface BattleState {
  status: BattleStatus;
  round: number;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyIntent: string;
  partyHpByCharacterId: Record<string, number>;
  downedCharacterIds: string[];
  lastResolvedTurn: number | null;
  rewardClaimedByCharacterId: Record<string, number>;
}

export interface BattleParticipant {
  sessionId: string;
  character: CharacterProfile;
  online: boolean;
  leftAt: number | null;
}

export interface BattleCommit {
  actionId: BattleActionId;
  committedAt: number;
}

export interface BattleResolution {
  sessionId: string;
  characterId: string;
  characterName: string;
  actionId: BattleActionId;
  actionLabel: string;
  roll: number;
  mod: number;
  total: number;
  success: boolean;
  damage: number;
  healing: number;
  incomingDamage: number;
  remainingHp: number;
  narrative: string;
  trait: keyof TraitSet;
  dc: number;
}

export interface BattleTurnResult {
  battleState: BattleState;
  results: BattleResolution[];
  logLines: string[];
  enemyDefeated: boolean;
  partyDefeated: boolean;
}

export const BATTLE_ACTIONS: BattleActionDefinition[] = [
  {
    id: 'strike',
    label: 'Strike',
    trait: 'ATH',
    dc: 11,
    successDamage: 6,
    failureDamage: 2,
    description: 'Reliable damage. Hits for 6, still clips for 2 on a miss.',
  },
  {
    id: 'heavy',
    label: 'Heavy',
    trait: 'ATH',
    dc: 15,
    successDamage: 11,
    failureDamage: 0,
    description: 'Risky burst damage. Hits hard, misses clean.',
  },
  {
    id: 'guard',
    label: 'Guard',
    trait: 'ATH',
    dc: 11,
    successDamage: 2,
    failureDamage: 0,
    guardReduction: 6,
    description: 'Brace the line. Reduce incoming damage by 6 and chip on success.',
  },
  {
    id: 'aid',
    label: 'Aid',
    trait: 'CHA',
    dc: 10,
    heal: 5,
    description: 'Patch up the lowest ally, or grant +2 to the next party action if nobody is hurt.',
  },
];

export const VICTORY_XP = 75;
export const FAILURE_XP = 15;
export const VICTORY_ITEM = 'Ashhide Charm';
export const FAILURE_ITEM = 'Cracked Ash Token';

const CLASS_ACTION_LABELS: Record<CharacterClassKey, Record<BattleActionId, string>> = {
  wizard: {
    strike: 'Arcane Dart',
    heavy: 'Overchannel',
    guard: 'Ward',
    aid: 'Mend',
  },
  fighter: {
    strike: 'Blade Strike',
    heavy: 'Cleave',
    guard: 'Guard',
    aid: 'Rally',
  },
  rogue: {
    strike: 'Quick Cut',
    heavy: 'Backstab',
    guard: 'Evasion',
    aid: 'Distract',
  },
  cleric: {
    strike: 'Radiant Blow',
    heavy: 'Judgement',
    guard: 'Sanctuary',
    aid: 'Blessing',
  },
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

export const deterministicD20 = (seed: string) => (hashSeed(seed) % 20) + 1;

export const getBattleAction = (actionId: string | undefined): BattleActionDefinition => (
  BATTLE_ACTIONS.find((action) => action.id === actionId) ?? BATTLE_ACTIONS[0]
);

export const getClassActionLabel = (classKey: CharacterClassKey, actionId: BattleActionId) => (
  CLASS_ACTION_LABELS[classKey]?.[actionId] ?? getBattleAction(actionId).label
);

export const getBattleReward = (status: BattleStatus) => {
  if (status === 'victory') {
    return { xp: VICTORY_XP, item: VICTORY_ITEM, label: `+${VICTORY_XP} XP + ${VICTORY_ITEM}` };
  }

  if (status === 'failure') {
    return { xp: FAILURE_XP, item: FAILURE_ITEM, label: `+${FAILURE_XP} XP + ${FAILURE_ITEM}` };
  }

  return { xp: 0, item: undefined, label: 'No reward yet' };
};

export const createInitialBattleState = (
  characters: CharacterProfile[],
): BattleState => {
  const partyHpByCharacterId = characters.reduce<Record<string, number>>((acc, character) => {
    acc[character.id] = Math.max(1, character.hp || character.maxHp);
    return acc;
  }, {});

  const enemyMaxHp = Math.max(26, 18 + characters.length * 10);

  return {
    status: 'active',
    round: 1,
    enemyName: 'Ash Warg',
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    enemyIntent: 'Rake every standing hero for 5 damage.',
    partyHpByCharacterId,
    downedCharacterIds: [],
    lastResolvedTurn: null,
    rewardClaimedByCharacterId: {},
  };
};

const getActiveParticipants = (
  participants: BattleParticipant[],
  battleState: BattleState,
) => participants.filter((participant) => (
  participant.leftAt == null
  && participant.online
  && !battleState.downedCharacterIds.includes(participant.character.id)
));

const rollForAction = (
  roomCode: string,
  turn: number,
  participant: BattleParticipant,
  action: BattleActionDefinition,
  bonus = 0,
) => {
  const seed = [
    roomCode,
    turn,
    participant.sessionId,
    participant.character.id,
    action.id,
  ].join(':');
  const roll = deterministicD20(seed);
  const mod = (participant.character.traits[action.trait] ?? 0) + bonus;
  const total = roll + mod;

  return { roll, mod, total, success: total >= action.dc };
};

const getLowestDamagedAlly = (
  activeParticipants: BattleParticipant[],
  battleState: BattleState,
) => {
  const damaged = activeParticipants
    .map((participant) => {
      const currentHp = battleState.partyHpByCharacterId[participant.character.id] ?? participant.character.maxHp;
      return { participant, currentHp };
    })
    .filter(({ participant, currentHp }) => currentHp < participant.character.maxHp)
    .sort((a, b) => a.currentHp - b.currentHp);

  return damaged[0] ?? null;
};

const makeResolution = (
  participant: BattleParticipant,
  action: BattleActionDefinition,
  rollData: ReturnType<typeof rollForAction>,
  damage: number,
  healing: number,
  incomingDamage: number,
  remainingHp: number,
  narrative: string,
): BattleResolution => ({
  sessionId: participant.sessionId,
  characterId: participant.character.id,
  characterName: participant.character.name,
  actionId: action.id,
  actionLabel: getClassActionLabel(participant.character.classKey, action.id),
  roll: rollData.roll,
  mod: rollData.mod,
  total: rollData.total,
  success: rollData.success,
  damage,
  healing,
  incomingDamage,
  remainingHp,
  narrative,
  trait: action.trait,
  dc: action.dc,
});

export const resolveBattleTurn = (
  roomCode: string,
  turn: number,
  battleStateInput: BattleState,
  participantsInput: BattleParticipant[],
  commits: Record<string, BattleCommit>,
): BattleTurnResult => {
  const battleState = clone(battleStateInput);
  const participants = clone(participantsInput);
  const activeParticipants = getActiveParticipants(participants, battleState);
  const results: BattleResolution[] = [];
  const logLines: string[] = [];

  if (battleState.status !== 'active' || activeParticipants.length === 0) {
    return {
      battleState,
      results,
      logLines,
      enemyDefeated: battleState.status === 'victory',
      partyDefeated: battleState.status === 'failure',
    };
  }

  const selectedActions = activeParticipants.map((participant) => ({
    participant,
    action: getBattleAction(commits[participant.sessionId]?.actionId) as BattleActionDefinition,
  }));

  let partyBonus = 0;
  const guardByCharacterId: Record<string, number> = {};

  selectedActions
    .filter(({ action }) => action.id === 'aid')
    .forEach(({ participant, action }) => {
      const rollData = rollForAction(roomCode, turn, participant, action);
      let healing = 0;
      let narrative = `${participant.character.name}'s aid does not find purchase.`;

      if (rollData.success) {
        const lowestAlly = getLowestDamagedAlly(activeParticipants, battleState);
        if (lowestAlly) {
          const target = lowestAlly.participant.character;
          const currentHp = battleState.partyHpByCharacterId[target.id] ?? target.maxHp;
          const nextHp = Math.min(target.maxHp, currentHp + (action.heal ?? 0));
          healing = nextHp - currentHp;
          battleState.partyHpByCharacterId[target.id] = nextHp;
          narrative = `${participant.character.name} restores ${healing} HP to ${target.name}.`;
        } else {
          partyBonus += 2;
          narrative = `${participant.character.name} sets up the next strike with +2 momentum.`;
        }
      }

      const remainingHp = battleState.partyHpByCharacterId[participant.character.id] ?? participant.character.maxHp;
      results.push(makeResolution(participant, action, rollData, 0, healing, 0, remainingHp, narrative));
      logLines.push(narrative);
    });

  selectedActions
    .filter(({ action }) => action.id !== 'aid')
    .forEach(({ participant, action }) => {
      const bonus = partyBonus > 0 ? 2 : 0;
      if (bonus > 0) partyBonus -= 2;

      const rollData = rollForAction(roomCode, turn, participant, action, bonus);
      const damage = rollData.success
        ? action.successDamage ?? 0
        : action.failureDamage ?? 0;

      if (action.guardReduction) {
        guardByCharacterId[participant.character.id] = action.guardReduction;
      }

      battleState.enemyHp = Math.max(0, battleState.enemyHp - damage);

      const narrative = damage > 0
        ? `${participant.character.name} uses ${getClassActionLabel(participant.character.classKey, action.id)} for ${damage} damage.`
        : `${participant.character.name}'s ${getClassActionLabel(participant.character.classKey, action.id)} misses.`;
      const remainingHp = battleState.partyHpByCharacterId[participant.character.id] ?? participant.character.maxHp;

      results.push(makeResolution(participant, action, rollData, damage, 0, 0, remainingHp, narrative));
      logLines.push(narrative);
    });

  if (battleState.enemyHp <= 0) {
    battleState.status = 'victory';
    battleState.enemyHp = 0;
    battleState.enemyIntent = 'Defeated';
    battleState.lastResolvedTurn = turn;
    logLines.push(`${battleState.enemyName} collapses into the ash. Victory.`);
    return { battleState, results, logLines, enemyDefeated: true, partyDefeated: false };
  }

  const incomingBaseDamage = 4 + battleState.round;

  activeParticipants.forEach((participant) => {
    const currentHp = battleState.partyHpByCharacterId[participant.character.id] ?? participant.character.maxHp;
    const reduction = guardByCharacterId[participant.character.id] ?? 0;
    const incomingDamage = Math.max(0, incomingBaseDamage - reduction);
    const nextHp = Math.max(0, currentHp - incomingDamage);
    battleState.partyHpByCharacterId[participant.character.id] = nextHp;

    const result = results.find((entry) => entry.sessionId === participant.sessionId);
    if (result) {
      result.incomingDamage = incomingDamage;
      result.remainingHp = nextHp;
    }

    if (nextHp <= 0 && !battleState.downedCharacterIds.includes(participant.character.id)) {
      battleState.downedCharacterIds.push(participant.character.id);
      logLines.push(`${participant.character.name} is downed by the counterattack.`);
    } else if (incomingDamage > 0) {
      logLines.push(`${battleState.enemyName} hits ${participant.character.name} for ${incomingDamage}.`);
    } else {
      logLines.push(`${participant.character.name} absorbs the counterattack.`);
    }
  });

  const survivors = getActiveParticipants(participants, battleState);
  const partyDefeated = survivors.length === 0;

  if (partyDefeated) {
    battleState.status = 'failure';
    battleState.enemyIntent = 'The warg holds the field.';
    logLines.push('The party is down. The encounter is lost, but lessons remain.');
  } else {
    battleState.round += 1;
    battleState.enemyIntent = `Rake every standing hero for ${4 + battleState.round} damage.`;
  }

  battleState.lastResolvedTurn = turn;

  return {
    battleState,
    results,
    logLines,
    enemyDefeated: false,
    partyDefeated,
  };
};
