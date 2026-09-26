export const SUPPORTER_BUNDLE = {
  id: 'supporter-pack-1', version: 1, name: 'The Wandering Innkeeper', amount: 1000, currency: 'USD',
  hats: ['teacup', 'lantern'],
  styles: ['teacup-rose', 'teacup-mint', 'lantern-plum', 'lantern-moss'],
} as const;

export const SUPPORTER_STYLES = [
  { id: 'teacup-rose', hat: 'teacup', label: 'Rose glaze', kind: 'color', color: '#d88891' },
  { id: 'teacup-mint', hat: 'teacup', label: 'Mint glaze', kind: 'color', color: '#8ebda8' },
  { id: 'lantern-plum', hat: 'lantern', label: 'Plum felt', kind: 'color', color: '#a78bbc' },
  { id: 'lantern-moss', hat: 'lantern', label: 'Moss felt', kind: 'color', color: '#8aab76' },
] as const;

export type PaymentEnvironment = 'sandbox' | 'production';
export interface PaidCollection {
  environment: PaymentEnvironment;
  revision: number;
  bundles: string[];
  hats: string[];
  styles: string[];
}
export interface PaymentConfig {
  environment: PaymentEnvironment;
  enabled: boolean;
  clientToken: string;
  launchOffer?: { endsAt: string; percent: 50 };
}
export interface Purchase {
  id: string;
  bundleId: string;
  environment: PaymentEnvironment;
  status: 'creating' | 'ready' | 'completed' | 'refunded' | 'disputed' | 'canceled';
  transactionId: string | null;
  launchDiscounted: boolean;
}
