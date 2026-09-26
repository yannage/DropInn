import type { PaymentConfig } from './payments';

interface PaddleClient {
  Environment: { set(value: 'sandbox'): void };
  Initialize(options: Record<string, unknown>): void;
  Update(options: Record<string, unknown>): void;
  Checkout: { open(options: Record<string, unknown>): void; close(): void };
}
declare global { interface Window { Paddle?: PaddleClient } }
let scriptPromise: Promise<PaddleClient> | undefined;
let configuredToken: string | undefined;
function loadPaddle(): Promise<PaddleClient> {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (!scriptPromise) scriptPromise = new Promise<PaddleClient>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => { clearTimeout(timeout); script.remove(); scriptPromise = undefined; reject(new Error('Checkout could not load. Check your connection and retry.')); };
    const timeout = window.setTimeout(fail, 12000);
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'; script.async = true;
    script.onload = () => { clearTimeout(timeout); if (window.Paddle) resolve(window.Paddle); else fail(); };
    script.onerror = fail;
    document.head.append(script);
  });
  return scriptPromise;
}
export async function openCheckout(config: PaymentConfig, transactionId: string, onEvent: (event: { name?: string }) => void) {
  const paddle = await loadPaddle();
  if (configuredToken && configuredToken !== config.clientToken) throw new Error('Payment settings changed. Reload before continuing.');
  if (!configuredToken) {
    if (config.environment === 'sandbox') paddle.Environment.set('sandbox');
    // Remove auto-open parameters: only the server-owned transaction below is opened.
    const url = new URL(location.href);
    url.searchParams.delete('_ptxn');
    history.replaceState(history.state, '', url);
    paddle.Initialize({ token: config.clientToken, eventCallback: onEvent });
    configuredToken = config.clientToken;
  } else paddle.Update({ eventCallback: onEvent });
  paddle.Checkout.open({ transactionId, settings: { displayMode: 'overlay', theme: 'light', locale: 'en', showAddDiscounts: false, allowLogout: false } });
}
export function closeCheckout() { window.Paddle?.Checkout.close(); }
