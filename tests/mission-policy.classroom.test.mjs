import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const selectors = {
  start: '[data-command=start]', pause: '[data-command=pause]', resume: '[data-command=resume]',
  boss: '[data-command=boss]', end: '[data-command=end]', podium: '[data-option=podium]',
  reveal: '[data-option=reveal]',
};

test('Chromium: politica Classroom live e riconnessione (demo)', async t => {
  const browser = await openBrowser('', {
    width: 1180, height: 820, beforeLoad: 'window.confirm = () => true;',
  });
  t.after(browser.close);
  const { origin, prefix, send } = browser;
  const parent = { evaluate: browser.evaluate, activate: () => send('Target.activateTarget', { targetId: browser.targetId }),
    screenshot: browser.screenshot };
  async function tab(query) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    await page('Runtime.enable');
    await page('Page.enable');
    await page('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 1, mobile: false });
    await page('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm = () => true;' });
    await page('Page.navigate', { url: origin + prefix + 'classroom.html?' + query });
    return {
      async evaluate(expression) {
        const response = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description);
        return response.result.value;
      },
      activate: () => send('Target.activateTarget', { targetId }),
      reload: () => page('Page.reload'),
      async screenshot() { return Buffer.from((await page('Page.captureScreenshot', { format: 'png' })).data, 'base64'); },
    };
  }
  const click = (page, selector) => page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  async function until(page, expression, ms = 6500) {
    const start = performance.now();
    let result;
    do {
      result = await page.evaluate(expression);
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 90));
    } while (performance.now() - start < ms);
    throw Error('Condizione non raggiunta: ' + expression + ' ' + await page.evaluate("document.querySelector('#feedback')?.textContent"));
  }
  async function capture(page, file) {
    const folder = process.env.CODESPACE_CLASSROOM_SHOTS;
    if (!folder) return;
    await page.activate();
    await mkdir(folder, { recursive: true });
    await writeFile(`${folder}/${file}.png`, await page.screenshot());
  }
  await until(parent, "!!document.querySelector('#viewport')");
  await capture(parent, '00-menu');
  await browser.page('Page.navigate', { url: origin + prefix + 'classroom.html?demo=1&role=host' });
  await until(parent, "document.readyState === 'complete' && !!document.querySelector('#host-login')");
  await capture(parent, '01-accesso-host');
  await click(parent, '#host-login');
  await until(parent, "!document.querySelector('#create-form').hidden");
  await capture(parent, '02-creazione');
  await parent.evaluate(`document.querySelector('[name=bossSeconds]').value = '10';
    document.querySelector('#create-form').requestSubmit();`);
  const pin = await until(parent, "document.querySelector('#pin-value').textContent");
  assert.match(pin, /^\d{6}$/);
  assert.ok(await until(parent, "document.querySelector('#join-qr').naturalWidth > 0"));
  const student = await tab('demo=1&pin=' + pin);
  await until(student, "document.querySelector('#join-pin')?.value");
  await capture(student, '03-accesso-studente');
  await student.evaluate(`document.querySelector('#join-form [name=name]').value = 'Aurora_42'; document.querySelector('#join-form').requestSubmit()`);
  await until(student, "document.querySelector('#clock').textContent.includes('attesa')");
  assert.equal(await student.evaluate("document.querySelector('#flight-frame').hidden"), true);
  await capture(student, '04-lobby-studente');
  await parent.activate();
  await until(parent, "document.querySelector('#participants').textContent.includes('1 connessi')");
  await capture(parent, '05-lobby-host');
  await click(parent, selectors.start);
  await until(parent, "document.querySelector('#clock').textContent.includes('Decollo tra')");
  await student.activate();
  await until(student, "document.querySelector('#flight-frame').contentDocument?.querySelector('#viewport')?.dataset.state === 'PLAYING'", 10000);
  const frameCount = limit => `document.querySelector('#flight-frame')?.contentDocument?.getElementById('mission-available')?.textContent === '${limit} / 22'`;
  await until(student, frameCount(10));
  for (const [step, limit] of [[3, 13], [4, 17], [4, 21], [1, 22]]) {
    await click(parent, `[data-mission-action=add][data-count="${step}"]`);
    await until(student, frameCount(limit));
  }
  await until(parent, "!document.getElementById('live-mission-controls').disabled");
  await parent.activate();
  await parent.evaluate(`(() => {
    const input = document.getElementById('live-mission-interval');
    input.value = '95';
    if (!input.checkValidity()) throw Error(input.validationMessage);
    input.dispatchEvent(new Event('change'));
  })()`);
  await until(parent, "document.getElementById('live-mission-status').textContent.includes('95 s') && !document.getElementById('live-mission-controls').disabled")
    .catch(async error => { throw Error(error.message + await parent.evaluate("document.getElementById('live-mission-status').textContent")); });
  await click(parent, '[data-mission-action=toggle]');
  await until(parent, "document.getElementById('live-mission-status').textContent.includes('sospese')");
  await until(parent, "!document.getElementById('live-mission-controls').disabled");
  await student.evaluate(`(() => {
    const frame = document.querySelector('#flight-frame').contentWindow;
    frame.addEventListener('message', event => {
      if (event.data?.type === 'cs:policy') frame.observedPolicy = event.data.settings;
    });
  })()`);
  await click(parent, '[data-mission-action=spawn]');
  await until(student, "document.querySelector('#flight-frame').contentWindow.observedPolicy?.missionSignal > 0");
  assert.equal(await student.evaluate("document.querySelector('#flight-frame').contentWindow.observedPolicy.missionInterval"), 95);
  await student.activate();
  await student.reload();
  await until(student, "!!document.querySelector('#flight-frame')?.contentDocument?.getElementById('mission-available')", 12000);
  await until(student, frameCount(22), 12000);
  await until(parent, "document.querySelector('#participants').textContent.includes('1 connessi')");
  assert.equal(await parent.evaluate("document.querySelector('#pin-value').textContent"), pin);
  assert.deepEqual(browser.errors, []);
});
