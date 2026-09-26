import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Paddle checkout viewport selection', () => {
  it.each([
    [320, 'multi-page'],
    [359, 'multi-page'],
    [360, 'one-page'],
    [1280, 'one-page'],
  ])('opens the server transaction at %ipx using %s', async (width, variant) => {
    const paddle = {
      Environment: { set: vi.fn() }, Initialize: vi.fn(), Update: vi.fn(),
      Checkout: { open: vi.fn(), close: vi.fn() },
    };
    vi.stubGlobal('window', { Paddle: paddle, matchMedia: () => ({ matches: Number(width) < 360 }) });
    vi.stubGlobal('location', { href: 'https://playdropinn.com/checkout?_ptxn=untrusted' });
    const replaceState = vi.fn();
    vi.stubGlobal('history', { state: null, replaceState });
    const { openCheckout } = await import('./checkout');
    const eventCallback = vi.fn();
    await openCheckout({ environment: 'sandbox', enabled: true, clientToken: 'test_fixture' }, 'txn_server_owned', eventCallback);
    expect(paddle.Environment.set).toHaveBeenCalledWith('sandbox');
    expect(paddle.Initialize).toHaveBeenCalledWith({ token: 'test_fixture', eventCallback });
    expect(String(replaceState.mock.calls[0][2])).toBe('https://playdropinn.com/checkout');
    expect(paddle.Checkout.open).toHaveBeenCalledWith({
      transactionId: 'txn_server_owned',
      settings: { displayMode: 'overlay', variant, theme: 'light', locale: 'en', showAddDiscounts: false, allowLogout: false },
    });
  });
});
