import type { CharacterProfile } from '../character';
import type { CollectionSnapshot } from './collection';
import type { PaymentConfig } from './payments';

export type AccountOperation = 'account' | 'hero-save' | 'hero-create' | 'hero-select' | 'claim-prepare' | 'claim-redeem' | 'collection' | 'craft' | 'checkout' | 'payment-status';
export interface SavedHero { playerId: string; character: CharacterProfile }
export interface AccountSnapshot {
  collection?: CollectionSnapshot;
  id: string;
  guest: boolean;
  email?: string;
  identities: string[];
  heroes: SavedHero[];
  selectedCharacterId: string;
  capabilities: { heroSlots: number; payments: boolean };
  payments?: PaymentConfig;
  providers: { google: boolean; email: boolean };
}
/** Free allowance is a server policy, independent of a future payment processor. */
export const FREE_ACCOUNT_CAPABILITIES = { heroSlots: 1, payments: false } as const;
