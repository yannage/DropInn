import assert from 'node:assert/strict';

// Run against the live, uncommitted first scene in the maintained local playthrough.
// These checks observe decoration; they never inject a room or advance its clock.
export async function checkStageMotion(page, note) {
  const viewport = page.viewportSize();
  const writes = [];
  const observeRequest = request => {
    if (!request.url().endsWith('/api/dropinn') || request.method() !== 'POST') return;
    const payload = request.postDataJSON();
    if (payload?.operation === 'command') writes.push(payload.command?.type);
  };
  page.on('request', observeRequest);
  try {
    await page.mouse.move(1, 1);
    await page.locator('.di-living-table[data-ambient-running=true]').waitFor();
    const atmosphere = page.locator('.di-stage-atmosphere');
    assert.equal(await atmosphere.getAttribute('data-environment'), 'village');
    assert.equal(await atmosphere.getAttribute('aria-hidden'), 'true');
    assert.equal(await atmosphere.locator('[data-ambient-mote]').count(), 4);
    assert.equal(await atmosphere.evaluate(node => getComputedStyle(node).pointerEvents), 'none');

    const before = await sceneState(page);
    const sample = await sampleMotion(page, 850);
    assert.ok(sample.targetFrames > 1, 'A scene illustration visibly changes transform between frames');
    assert.ok(sample.heroFrames > 1, 'A hero illustration visibly changes transform between frames');
    assert.equal(sample.hitAreaMoved, false, 'Idle illustrations do not move either button hit area');
    note('stage-ambient-actors-move-inside-stable-hit-areas', sample);

    for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(size);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForFunction(() => [...document.querySelectorAll('.di-scene-stage > .di-stage-art,.di-stage-targets .di-target-art img')].every(image => image.complete && image.naturalWidth > 0));
      const fit = await page.evaluate(() => ({
        width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
        stageArt: document.querySelectorAll('.di-scene-stage > .di-stage-art').length,
        targets: [...document.querySelectorAll('.di-stage-targets [data-scene-target]')].map(node => {
          const rect = node.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom, art: !!node.querySelector('.di-target-art img') };
        }),
      }));
      assert.equal(fit.stageArt, 1, 'The authored background remains visible beneath the atmosphere');
      assert.equal(fit.targets.length, 4);
      assert.ok(fit.scrollWidth <= fit.width + 1 && fit.scrollHeight <= fit.height + 1, JSON.stringify(fit));
      for (const target of fit.targets) assert.ok(target.art && target.width >= 44 && target.height >= 44 && target.x >= 0 && target.y >= 0 && target.right <= fit.width + 1 && target.bottom <= fit.height + 1, JSON.stringify(target));
      assert.equal(await page.locator('.di-scene-hand button[aria-label$=" token"]').count(), 4);
      await page.screenshot({ path: `output/playwright/living-stage-motion-${size.width}.png` });
    }
    await page.setViewportSize(viewport);
    const target = page.locator('.di-stage-targets [data-idle=breathe]').first();
    await target.click();
    await page.getByRole('group', { name: 'Moves for this target' }).waitFor();
    assert.equal(await target.getAttribute('aria-expanded'), 'true', 'Pointer inspection reaches the moving illustration\'s stationary button');
    await page.getByRole('button', { name: 'Close inspection', exact: true }).click();

    // Opening an existing drawer must pause background activity without a write.
    await page.getByRole('button', { name: 'Invite', exact: true }).click();
    await page.locator('.di-living-table[data-ambient-running=false]').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.di-living-table[data-ambient-running=true]').waitFor();
    await page.mouse.move(1, 1);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.di-living-table[data-quiet=true]').waitFor();
    await atmosphere.waitFor({ state: 'detached' });
    const quiet = await sampleMotion(page, 250);
    assert.equal(quiet.targetFrames, 1, 'Reduced motion keeps scene illustrations still');
    assert.equal(quiet.heroFrames, 1, 'Reduced motion keeps heroes still');
    assert.equal(quiet.hitAreaMoved, false);
    await page.screenshot({ path: 'output/playwright/living-stage-motion-reduced-390.png' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.di-living-table[data-quiet=false][data-ambient-running=true]').waitFor();
    await atmosphere.waitFor();
    const restored = await sampleMotion(page, 450);
    assert.ok(restored.targetFrames > 1 && restored.heroFrames > 1, 'Changing the preference live restores gentle motion');
    assert.deepEqual(await sceneState(page), before, 'Ambient play, inspection and reduced motion preserve gameplay state');
    assert.deepEqual(writes, [], 'Atmosphere and inspection never issue a gameplay command');
    note('stage-ambient-responsive-pointer-drawer-reduced-motion', { viewports: ['1280x800', '390x844', '320x568'], commandCount: writes.length });
  } finally {
    page.off('request', observeRequest);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize(viewport);
  }
}

async function sceneState(page) {
  return page.evaluate(async () => {
    const { room } = (await import('/src/store/adventureStore.ts')).useAdventureStore.getState();
    return Object.fromEntries(['turn', 'phase', 'deadline', 'progress', 'danger', 'commits'].map(field => [field, room[field]]));
  });
}

async function sampleMotion(page, duration) {
  return page.evaluate(duration => new Promise(resolve => {
    const target = document.querySelector('.di-stage-targets [data-idle=breathe]');
    const hero = document.querySelector('.di-stage-hero[data-idle=breathe]');
    if (!target || !hero) throw new Error('Expected a breathing scene actor and an upright hero');
    const box = node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
    const initial = [box(target), box(hero)];
    const targetFrames = new Set(), heroFrames = new Set();
    let started, hitAreaMoved = false;
    const frame = time => {
      started ??= time;
      targetFrames.add(getComputedStyle(target.querySelector('.di-target-art img')).transform);
      heroFrames.add(getComputedStyle(hero.querySelector('.di-avatar')).transform);
      for (const [index, node] of [target, hero].entries()) {
        if (box(node).some((value, axis) => Math.abs(value - initial[index][axis]) > .1)) hitAreaMoved = true;
      }
      if (time - started >= duration) resolve({ targetFrames: targetFrames.size, heroFrames: heroFrames.size, hitAreaMoved });
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }), duration);
}

// Authored rendering fixture, deliberately separate from the real commands above.
// Freeze the presentation clock mid-beat to inspect late-arriving hit/miss styles.
export async function checkStageActionStyles(page, note) {
  const viewport = page.viewportSize();
  await page.waitForFunction(async () => {
    const state = (await import('/src/store/adventureStore.ts')).useAdventureStore.getState();
    return !state.syncing && !state.loading;
  });
  await page.evaluate(async () => {
    const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
    const saved = store.getState();
    window.__motionRestore = { now: Date.now, room: saved.room, syncRoom: saved.syncRoom };
    window.__motionClock = Date.now();
    Date.now = () => window.__motionClock;
    store.setState({ syncRoom: async () => {} });
  });
  const fixtures = [
    { name: 'fight-hit', token: 'fight', success: true, width: 320 },
    { name: 'fight-miss', token: 'fight', success: false, width: 320 },
    { name: 'speech', token: 'influence', success: true, width: 390 },
    { name: 'search', token: 'investigate', success: true, width: 390 },
    { name: 'help', token: 'assist', success: true, width: 390 },
    { name: 'rescue-healing', token: undefined, success: true, width: 390 },
  ];
  try {
    for (const [index, fixture] of fixtures.entries()) {
      await page.setViewportSize({ width: fixture.width, height: fixture.width === 320 ? 568 : 844 });
      await page.evaluate(async index => {
        const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
        const original = window.__motionRestore.room;
        const room = { ...structuredClone(original), chapter: 1, chapterRound: 1, turn: original.turn + index + 1, status: 'active', phase: 'choosing', progress: 0, danger: 0, flags: [], outcomes: [], events: [], combinations: [], commits: {}, revealUntil: null, deadline: Date.now() + 60000 };
        room.enemyIntent = { turn: room.turn, sourceId: 'pack', targetActorId: store.getState().userId, baseDamage: 3 };
        store.setState({ room });
      }, index);
      await page.waitForFunction(() => !document.querySelector('.di-stage-effects') && document.querySelector('.di-scene-dock')?.dataset.phase === 'choosing');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(async fixture => {
        const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
        const { room, userId } = store.getState();
        const rescue = !fixture.token;
        const event = { id: `qa-motion-${fixture.name}`, chapter: room.chapter, turn: room.turn, at: Date.now() - 600, kind: rescue ? 'consequence' : 'action', actorId: userId, actorName: 'Animation fixture', text: 'Synthetic presentation check', success: fixture.success,
          result: rescue ? { targetKind: 'hero', targetId: userId, healing: 2 } : { token: fixture.token, targetKind: 'scene', targetId: 'pack', progress: fixture.success ? 1 : 0 } };
        store.setState({ room: { ...room, phase: 'reveal', events: [event], updatedAt: event.at, revealUntil: Date.now() + 10000, progress: fixture.success && !rescue ? 1 : 0 } });
      }, fixture);
      const effect = page.locator(`[data-stage-event="qa-motion-${fixture.name}"]`);
      await effect.waitFor();
      const expected = fixture.token ?? 'assist';
      assert.equal(await effect.getAttribute('data-action-effect'), expected);
      assert.equal(await effect.locator(`.di-action-motif.di-signature-${expected}`).count(), 1);
      const target = page.locator('[data-scene-target=pack] > .di-target-art');
      const computed = await target.evaluate(node => ({ name: getComputedStyle(node).animationName, delay: getComputedStyle(node).animationDelay }));
      if (fixture.token && fixture.success) {
        assert.equal(computed.name, fixture.token === 'fight' ? 'di-target-recoil' : 'di-target-answer', 'Confirmed target response overrides the old generic enemy animation');
        assert.ok(parseFloat(computed.delay) < 0, 'Late-mounted response fast-forwards its confirmed contact');
      } else assert.equal(computed.name, 'none', 'A miss or unrelated consequence cannot play a target hit reaction');
      if (!fixture.success) assert.equal(await effect.locator('.di-strike-contact').count(), 0, 'Misses have no contact marks');
      if (!fixture.token) assert.equal(await effect.locator('.di-signature-assist.is-healing').count(), 1, 'Token-less rescue healing uses the healing emblem');
      await page.evaluate(() => {
        for (const root of document.querySelectorAll('.di-stage-effects,.di-target-art')) {
          for (const animation of root.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 0; }
        }
      });
      await page.screenshot({ path: `output/playwright/living-action-${fixture.name}-${fixture.width}.png` });
      note('action-motif-rendering-fixture', { action: fixture.name, effect: expected, targetAnimation: computed.name, targetDelay: computed.delay, evidence: 'Synthetic room projection frozen 450ms into a confirmed beat; not a server command.' });
    }
    const beforeQuiet = await sceneState(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.di-living-table[data-quiet=true]').waitFor();
    assert.equal(await page.locator('.di-stage-effects,.di-action-motif').count(), 0, 'Quiet mode removes decorative action signatures');
    assert.equal(await page.locator('[data-scene-target=pack] > .di-target-art').evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.deepEqual(await sceneState(page), beforeQuiet, 'Quiet presentation retains the recorded outcome');
    note('action-motif-quiet-preserves-outcome');
  } finally {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(async () => {
      Date.now = window.__motionRestore.now;
      (await import('/src/store/adventureStore.ts')).useAdventureStore.setState({ room: window.__motionRestore.room, syncRoom: window.__motionRestore.syncRoom });
      delete window.__motionRestore;
      delete window.__motionClock;
    });
    await page.setViewportSize(viewport);
  }
}
