import { randomUUID } from 'node:crypto';

export async function createLocalPair(browser, baseURL) {
  const base = new URL(baseURL);
  if (!['http:', 'https:'].includes(base.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
    throw new Error('Local QA pair requires an explicit loopback URL.');
  }
  const contexts = [];
  try {
    const pages = [];
    const run = randomUUID().slice(0, 8);
    for (const actor of ['a', 'b']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      contexts.push(context);
      const response = await context.request.post(new URL('/api/dropinn', base).href, {
        data: { operation: 'list', sessionId: `skillqa-${run}-${actor}` }, timeout: 15000,
      });
      const body = await response.json();
      if (!response.ok() || body.error || body.backend !== 'local') throw new Error('Expected a working local command service; check Vite port/backend.');
      const page = await context.newPage();
      const url = new URL('/', base);
      url.searchParams.set('session', `skillqa-${run}-${actor}`);
      await page.goto(url.href);
      pages.push(page);
    }
    return { pages, contexts, close: () => Promise.all(contexts.map(context => context.close())) };
  } catch (error) {
    await Promise.allSettled(contexts.map(context => context.close()));
    throw error;
  }
}

export async function actAndWait(page, action, matches, timeout = 15000) {
  // Concurrently awaiting prevents an orphaned rejection if the click fails.
  const [response] = await Promise.all([
    page.waitForResponse(response => {
      if (new URL(response.url()).pathname !== '/api/dropinn' || response.request().method() !== 'POST') return false;
      try { return matches(response.request().postDataJSON()); } catch { return false; }
    }, { timeout }),
    Promise.resolve().then(action),
  ]);
  const body = await response.json();
  if (!response.ok() || body.error) throw new Error(`DropInn request failed (${response.status()}): ${body.error || 'invalid response'}`);
  return body;
}

export async function failRoomReads(page) {
  const pattern = '**/api/dropinn';
  const handler = async route => {
    let payload;
    try { payload = route.request().postDataJSON(); } catch { /* Other request type. */ }
    if (payload?.operation === 'read') await route.abort('failed');
    else await route.fallback();
  };
  await page.route(pattern, handler);
  return () => page.unroute(pattern, handler);
}
