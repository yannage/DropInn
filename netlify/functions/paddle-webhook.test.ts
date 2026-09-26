import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/payments', () => ({ handlePaddleWebhook: vi.fn(async () => new Response('ok')) }));

import { handlePaddleWebhook } from '../../server/payments';
import sandboxWebhook from './paddle-webhook';
import liveWebhook from './paddle-live-webhook';

const request = new Request('https://playdropinn.com/.netlify/functions/paddle-webhook', { method: 'POST' });

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('Paddle webhook environment routing', () => {
  it('preserves the existing sandbox variables before live migration', async () => {
    vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('PADDLE_API_KEY', 'pdl_sdbx_apikey_old');
    vi.stubEnv('PADDLE_WEBHOOK_SECRET', 'sandbox-old-secret');
    await sandboxWebhook(request);
    expect(handlePaddleWebhook).toHaveBeenCalledWith(request, expect.objectContaining({
      PADDLE_ENVIRONMENT: 'sandbox', PADDLE_API_KEY: 'pdl_sdbx_apikey_old', PADDLE_WEBHOOK_SECRET: 'sandbox-old-secret',
    }));
  });

  it('keeps sandbox callbacks isolated after the main checkout switches to live', async () => {
    vi.stubEnv('PADDLE_ENVIRONMENT', 'production');
    vi.stubEnv('PADDLE_API_KEY', 'pdl_sdbx_apikey_old');
    vi.stubEnv('PADDLE_WEBHOOK_SECRET', 'sandbox-old-secret');
    vi.stubEnv('PADDLE_LIVE_API_KEY', 'pdl_live_apikey_new');
    vi.stubEnv('PADDLE_LIVE_WEBHOOK_SECRET', 'live-new-secret');
    await sandboxWebhook(request);
    expect(handlePaddleWebhook).toHaveBeenCalledWith(request, expect.objectContaining({
      PADDLE_ENVIRONMENT: 'sandbox', PADDLE_API_KEY: 'pdl_sdbx_apikey_old', PADDLE_WEBHOOK_SECRET: 'sandbox-old-secret',
    }));
  });

  it('uses only dedicated live credentials at the live destination', async () => {
    vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('PADDLE_API_KEY', 'pdl_sdbx_apikey_main');
    vi.stubEnv('PADDLE_WEBHOOK_SECRET', 'sandbox-main-secret');
    vi.stubEnv('PADDLE_LIVE_API_KEY', 'pdl_live_apikey_new');
    vi.stubEnv('PADDLE_LIVE_WEBHOOK_SECRET', 'live-new-secret');
    await liveWebhook(request);
    expect(handlePaddleWebhook).toHaveBeenCalledWith(request, expect.objectContaining({
      PADDLE_ENVIRONMENT: 'production', PADDLE_LIVE_API_KEY: 'pdl_live_apikey_new', PADDLE_LIVE_WEBHOOK_SECRET: 'live-new-secret',
    }));
  });
});
