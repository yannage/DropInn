import { describe, expect, it } from 'vitest';
import { publicMerchUrl } from './merch';

describe('public merchandise checkout destination', () => {
  it.each([null, '', 'not a URL', 'https://www.printful.com/dashboard/sync/update?id=475452212',
    'https://playdropinn.printful.me', 'http://playdropinn.printful.me/product/tee',
    'https://playdropinn.printful.me.evil.test/product/tee', 'https://other.printful.me/product/tee',
    'https://user:password@playdropinn.printful.me/product/tee',
    'https://playdropinn.printful.me:8443/product/tee',
  ])('keeps purchases unavailable for %s', value => {
    expect(publicMerchUrl(value)).toBeNull();
  });
  it('accepts the verified storefront’s public product URL', () => {
    const url = 'https://playdropinn.printful.me/product/tavern-sign-tee';
    expect(publicMerchUrl(url)).toBe(url);
  });
});
