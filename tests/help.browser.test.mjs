import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

test('Chromium: 40 richieste d’aiuto in 20 cicli consecutivi con due studenti (demo)', async t => {
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
      beforeLoad: source => page('Page.addScriptToEvaluateOnNewDocument', { source }),
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
    throw Error('Condizione non raggiunta: ' + expression + ' ' + JSON.stringify(await page.evaluate("['feedback','clock','help','help-status'].map(id => [id, document.getElementById(id)?.textContent, document.getElementById(id)?.disabled, document.getElementById(id)?.hidden])")));
  }
  await until(parent, "!!document.querySelector('#viewport')");
  await browser.page('Page.navigate', { url: origin + prefix + 'classroom.html?demo=1&role=host' });
  await until(parent, "document.readyState === 'complete' && !!document.querySelector('#host-login')");
  await click(parent, '#host-login');
  await until(parent, "!document.querySelector('#create-form').hidden");
  await parent.evaluate(`document.querySelector('[name=bossSeconds]').value = '10';
    document.querySelector('#create-form').requestSubmit();`);
  const pin = await until(parent, "document.querySelector('#pin-value').textContent");
  assert.match(pin, /^\d{6}$/);
  assert.ok(await until(parent, "document.querySelector('#join-qr').naturalWidth > 0"));
  const student = await tab('demo=1&pin=' + pin);
  await until(student, "document.querySelector('#join-pin')?.value");
  await student.evaluate(`document.querySelector('#join-form [name=name]').value = 'Aurora_42'; document.querySelector('#join-form').requestSubmit()`);
  await until(student, "document.querySelector('#clock').textContent.includes('attesa')");
  assert.equal(await student.evaluate("document.querySelector('#flight-frame').hidden"), true);
  await parent.activate();
  await until(parent, "document.querySelector('#participants').textContent.includes('1 connessi')");
  const peer = await tab('demo=1&pin=' + pin);
  await peer.activate();
  await until(peer, "document.querySelector('#join-pin')?.value");
  await peer.evaluate(`document.querySelector('#join-form [name=name]').value = 'Vega_43'; document.querySelector('#join-form').requestSubmit()`);
  await parent.activate();
  await until(parent, "document.querySelector('#participants').textContent.includes('2 connessi')");
  await click(parent, '[data-option=rocks]');
  await until(parent, "document.querySelector('[data-option=rocks]').textContent === 'Riattiva asteroidi'");
  await click(parent, '[data-command=start]');
  const clients = [[student, 'Aurora_42'], [peer, 'Vega_43']];
  const available = "document.querySelector('#help') && !document.querySelector('#help').hidden && !document.querySelector('#help').disabled";
  const request = "document.querySelector('#help').textContent === 'Chiedi aiuto'";
  const state = expected => `document.querySelector('#flight-frame')?.contentDocument?.querySelector('#viewport')?.dataset.state === '${expected}'`;
  const hostRequest = name => `button[aria-label="Risolvi richiesta di ${name}"]`;
  for (const [client] of clients) {
    await client.activate();
    await until(client, available, 12000);
    await until(client, `${state('PLAYING')} || ${state('PAUSED')}`, 12000);
  }

  for (let round = 0; round < 20; round++) {
    for (const [client] of clients) {
      await client.activate();
      await until(client, `${available} && ${request}`);
      if (round === 0) {
        await client.evaluate(`(() => {
          const doc = document.querySelector('#flight-frame').contentDocument;
          if (doc.querySelector('#viewport').dataset.state === 'PAUSED') doc.querySelector('[data-action=resume]').click();
          document.querySelector('#help').click();
        })()`);
        await until(client, state('PLAYING'));
      } else await click(client, '#help');
    }
    await parent.activate();
    for (const [, name] of clients) {
      const selector = JSON.stringify(hostRequest(name));
      await until(parent, `!!document.querySelector(${selector}) && !document.querySelector(${selector}).disabled`);
    }
    if (round === 4) {
      await student.activate();
      await student.reload();
      await until(student, `(${available}) && !(${request})`, 12000);
      await parent.activate();
    }
    if (round === 9) {
      await parent.activate();
      await until(parent, "!document.querySelector('[data-command=pause]').disabled");
      await click(parent, '[data-command=pause]');
      await until(parent, "document.querySelector('#phase-label').textContent === 'Pausa globale'");
      for (const [client] of clients) await until(client, state('PAUSED'));
    }
    for (const [client, name] of clients) {
      const selector = hostRequest(name);
      await parent.activate();
      await click(parent, selector);
      await until(parent, `!document.querySelector(${JSON.stringify(selector)})`);
      await client.activate();
      await until(client, `(${available}) && (${request}) && document.querySelector('#help-status').textContent.includes('risolto')`);
      if (round === 9) await until(client, state('PAUSED'));
    }
    if (round === 9) {
      await parent.activate();
      await until(parent, "!document.querySelector('[data-command=resume]').disabled");
      await click(parent, '[data-command=resume]');
      await student.activate();
      await until(student, state('PLAYING'));
      await peer.activate();
      await until(peer, state('PLAYING'));
    }
  }
  t.diagnostic('20 cicli risolti per ciascuno dei due studenti');
  await student.activate();
  await until(student, available);
  await click(student, '#help');
  await parent.activate();
  await until(parent, `!!document.querySelector(${JSON.stringify(hostRequest('Aurora_42'))})`);
  await student.activate();
  await until(student, `(${available}) && !(${request})`);
  await click(student, '#help');
  await parent.activate();
  await until(parent, `!document.querySelector(${JSON.stringify(hostRequest('Aurora_42'))})`);
  await until(student, `(${available}) && (${request})`);
  await student.activate();
  await student.beforeLoad(`(() => {
    if (window !== top) return;
    const key = Object.keys(sessionStorage).find(key => key.includes(':flight:'));
    const saved = JSON.parse(sessionStorage.getItem(key));
    saved.recovery.drafts[1] = 'velocita = 8 # bozza da conservare';
    saved.recovery.checkpoint = { mode: 'PLAYING', time: 8, score: 0, mission: 1 };
    sessionStorage.setItem(key, JSON.stringify(saved));
  })()`);
  await student.reload();
  await until(student, state('MISSION'), 12000);
  await until(student, `(${available}) && (${request})`);
  await click(student, '#help');
  await parent.activate();
  const missionRequest = hostRequest('Aurora_42');
  await until(parent, `!!document.querySelector(${JSON.stringify(missionRequest)})`);
  await click(parent, missionRequest);
  await student.activate();
  await until(student, "document.querySelector('#help-status').textContent.includes('risolto')");
  await until(student, state('MISSION'));
  assert.equal(await student.evaluate("document.querySelector('#flight-frame').contentDocument.querySelector('#mission-code').value"),
    'velocita = 8 # bozza da conservare');
  assert.deepEqual(browser.errors, []);
});
