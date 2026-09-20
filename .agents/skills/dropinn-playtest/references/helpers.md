# Node Playwright helpers

These helpers work with the repository's existing `playwright` package. They are optional for terminal-driven browser scripts; do not import them into restricted browser-control runtimes or bypass those tools' rules. Run `.mjs` scripts from the repository so dependencies resolve.

```js
import { chromium } from 'playwright';
import { createLocalPair, actAndWait, failRoomReads } from './.agents/skills/dropinn-playtest/scripts/browser-helpers.mjs';
const browser = await chromium.launch();
const pair = await createLocalPair(browser, 'http://127.0.0.1:5173');
try {
  // Inspect the current UI, create a private table, and join the guest.
  // Then arm the matching wait before the actual observed control is clicked:
  // const result = await actAndWait(pair.pages[0], () => confirm.click(),
  //   payload => payload.operation === 'command' && payload.command?.type === 'act');
  // const restore = await failRoomReads(pair.pages[0]);
  // try { ...reload and assert recovery feedback... } finally { await restore(); }
} finally { await pair.close(); await browser.close(); }
```

`createLocalPair` only permits a loopback URL and verifies the response backend is local. It does not join a room. `actAndWait` checks HTTP/application success and returns parsed JSON; callers assert behavior. `failRoomReads` only aborts read operations and returns its cleanup function. For uncertain-action delivery, implement a separate response-loss scenario; this read-only failure injector does not simulate committed commands.
