import assert from 'node:assert/strict';
import { openBrowser } from '../tests/browser.mjs';

const count = Number(process.env.CODESPACE_SESSIONS ?? 30);
if (!Number.isInteger(count) || count < 1 || count > 30) throw Error('Numero di sessioni non valido');
const browser = await openBrowser();
const { send } = browser;
const contexts = [];

async function launch(index) {
  const { browserContextId } = await send('Target.createBrowserContext');
  contexts.push(browserContextId);
  const { targetId } = await send('Target.createTarget', { browserContextId, url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page('Page.enable');
  await page('Network.enable');
  await page('Runtime.enable');
  await page('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true, filter: [{ type: 'worker' }, { exclude: true }] });
  await page('Page.addScriptToEvaluateOnNewDocument', { source: `
    addEventListener('load', () => {
      document.querySelector('#teacher-open').click();
      document.querySelector('#teacher-launch').click();
      const editor = document.querySelector('#mission-code');
      editor.value = "velocita = 5 * 2\\nprint(${index})";
      editor.dispatchEvent(new Event('input'));
      window.runAt = performance.now();
      document.querySelector('#mission-run').click();
    }, { once: true });
  ` });
  return { index, page };
}

try {
  const tabs = await Promise.all(Array.from({ length: count }, (_, i) => launch(i + 1)));
  const start = performance.now();
  await Promise.all(tabs.map(({ page }) => page('Page.navigate', { url: browser.origin + browser.prefix })));
  const results = await Promise.all(tabs.map(async ({ index, page }) => {
    let result;
    for (let tries = 0; tries < 45; tries++) {
      const response = await page('Runtime.evaluate', { returnByValue: true, expression: `(() => {
        const status = document.getElementById('mission-status');
        if (!['success','error'].includes(status?.dataset.result)) return null;
        return { output: document.getElementById('mission-output').textContent,
          status: status.dataset.result, message: status.textContent,
          millis: performance.now() - window.runAt,
          save: JSON.parse(localStorage.getItem('code-space:progress:v2')) };
      })()` });
      result = response.result.value;
      if (result) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(result, `Sessione ${index} senza risposta`);
    assert.equal(result.status, 'success', `Sessione ${index}: ${result.message}`);
    assert.equal(result.output, index + '\n');
    assert.deepEqual(result.save.completed, [1]);
    assert.match(result.save.drafts[1], new RegExp(`print\\(${index}\\)$`));
    return result.millis;
  }));
  assert.deepEqual(browser.errors, []);
  assert.ok(browser.network.some(url => url.endsWith('/workers/python.worker.js')));
  assert.ok(browser.network.every(url => url.startsWith(browser.origin + browser.prefix)));
  console.log(JSON.stringify({ isolatedContexts: count, durationMs: performance.now() - start,
    minMissionObservationMs: Math.min(...results), maxMissionObservationMs: Math.max(...results),
    errors: browser.errors.length, observedRequests: browser.network.length, browser: browser.version }));
} finally {
  await Promise.allSettled(contexts.map(browserContextId => send('Target.disposeBrowserContext', { browserContextId })));
  await browser.close();
}
