import type { CharacterProfile } from '../character';

export type AccountOperation = 'account' | 'hero-save' | 'hero-create' | 'hero-select' | 'claim-prepare' | 'claim-redeem';
export interface SavedHero { playerId: string; character: CharacterProfile }
export interface AccountSnapshot {
  id: string;
  guest: boolean;
  email?: string;
  identities: string[];
  heroes: SavedHero[];
  selectedCharacterId: string;
  capabilities: { heroSlots: number; payments: false };
  providers: { google: boolean; email: boolean };
}
/** Free allowance is a server policy, independent of a future payment processor. */
export const FREE_ACCOUNT_CAPABILITIES = { heroSlots: 1, payments: false } as const;
