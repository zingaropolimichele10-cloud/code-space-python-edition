import assert from 'node:assert/strict';
import { openBrowser } from '../tests/browser.mjs';

const count = Number(process.env.CODESPACE_CLASSROOM_COUNT ?? 30);
assert.ok(Number.isInteger(count) && count >= 1 && count <= 50);
const browser = await openBrowser('classroom.html?demo=1&role=host', {
  extraArgs: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const { origin, prefix, send } = browser;
async function until(evaluate, expression, timeout = 25000) {
  const started = performance.now();
  for (;;) {
    const result = await evaluate(expression);
    if (result) return result;
    if (performance.now() - started > timeout) throw Error('Tempo scaduto: ' + expression);
    await new Promise(resolve => setTimeout(resolve, 120));
  }
}

try {
  await until(browser.evaluate, "document.readyState === 'complete' && document.querySelector('#host-login')");
  await browser.evaluate("document.querySelector('#host-login').click()");
  await until(browser.evaluate, "!document.querySelector('#create-form').hidden");
  await browser.evaluate(`document.querySelector('[name=capacity]').value = '${count}'; document.querySelector('#create-form').requestSubmit();`);
  const pin = await until(browser.evaluate, "document.querySelector('#pin-value').textContent");
  const started = performance.now();
  const tabs = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank', background: true });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    await page('Page.enable');
    await page('Page.addScriptToEvaluateOnNewDocument', { source: `
      addEventListener('load', () => {
        const form = document.querySelector('#join-form');
        form.elements.name.value = 'Vega${index + 1}';
        form.requestSubmit();
      }, { once: true });
    ` });
    return page;
  }));
  await Promise.all(tabs.map(page => page('Page.navigate', { url: origin + prefix + 'classroom.html?demo=1&pin=' + pin })));
  const snapshot = `(async () => {
    const { demoAdapter } = await import('./js/classroom/demo.mjs');
    const adapter = demoAdapter('observer');
    try {
      const room = (await adapter.get('pins/${pin}')).room;
      const members = Object.values(await adapter.get('members/' + room) ?? {});
      const online = Object.values(await adapter.get('presence/' + room) ?? {}).filter(value => Object.values(value).includes(true)).length;
      return { online, distinctNames: new Set(members.map(player => player.name)).size,
        distinctSeats: new Set(members.map(player => player.seat)).size };
    } finally { adapter.dispose(); }
  })()`;
  let result;
  try {
    result = await until(browser.evaluate,
      `(async () => { const stats = await ${snapshot}; return stats.online === ${count} ? stats : null; })()`, 45000);
  } catch (error) {
    console.log(JSON.stringify({ last: await browser.evaluate(snapshot), errors: browser.errors }));
    throw error;
  }
  assert.deepEqual(result, { online: count, distinctNames: count, distinctSeats: count });
  assert.equal(browser.errors.length, 0);
  console.log(JSON.stringify({ ...result, elapsedMs: Math.round(performance.now() - started), browser: browser.version,
    mode: 'demo nello stesso profilo Chrome' }));
} finally { await browser.close(); }
