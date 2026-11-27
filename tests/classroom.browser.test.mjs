import { answerQuiz } from './quiz-fixture.mjs';
import { missions } from '../js/missions/catalog.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const selectors = {
  start: '[data-command=start]', pause: '[data-command=pause]', resume: '[data-command=resume]',
  boss: '[data-command=boss]', end: '[data-command=end]', podium: '[data-option=podium]',
  reveal: '[data-option=reveal]',
};

test('Chromium: demo Classroom dalla lobby al podio, proiettore e 22 missioni prima e dopo il boss', async t => {
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
  await parent.evaluate(`document.querySelector('[name=bossSeconds]').value = '10'; document.querySelector('[name=missionLimit]').value = '22';
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
  await student.evaluate("document.querySelector('#flight-frame').scrollIntoView()");
  await capture(student, '06-gameplay');
  const frameSample = await student.evaluate(`new Promise(resolve => {
    const w = document.querySelector('#flight-frame').contentWindow;
    const intervals = [];
    let start, previous;
    function sample(now) {
      start ??= now;
      if (previous != null) intervals.push(now - previous);
      previous = now;
      if (now - start < 1800) w.requestAnimationFrame(sample);
      else {
        intervals.sort((a,b) => a-b);
        resolve({ frames: intervals.length, seconds: (now-start)/1000,
          fps: intervals.length*1000/(now-start), p95: intervals[Math.floor(intervals.length*.95)] });
      }
    }
    w.requestAnimationFrame(sample);
  })`);
  assert.ok(frameSample.frames > 10);
  t.diagnostic('RAF Classroom demo ' + JSON.stringify(frameSample));

  await parent.activate();
  await until(parent, "!document.querySelector('[data-command=pause]').disabled");
  await click(parent, selectors.pause);
  await student.activate();
  await until(student, "document.querySelector('#phase-label').textContent === 'Pausa globale'");
  assert.equal(await student.evaluate("document.querySelector('#flight-frame').contentDocument.querySelector('#viewport').dataset.state"), 'PAUSED');
  await click(student, '#help');
  await parent.activate();
  await until(parent, "document.querySelector('#rank-body').textContent.includes('Aiuto richiesto')");
  await parent.evaluate("document.querySelector('#rank').scrollIntoView({block:'end'})");
  await capture(parent, '07-dashboard');
  await click(parent, selectors.resume);
  await student.activate();
  await until(student, "document.querySelector('#flight-frame').contentDocument.querySelector('#viewport').dataset.state === 'PLAYING'");
  async function speedUpFlight() {
    await student.evaluate(`(() => {
      const frame = document.querySelector('#flight-frame').contentWindow;
      const nativeRAF = frame.requestAnimationFrame.bind(frame);
      frame.Math.random = () => .5;
      if (frame.fastTestFlight) return;
      frame.fastTestFlight = true;
      let now = frame.performance.now();
      let callbacks = [];
      const pump = actual => {
        now = Math.max(now, actual);
        for (let i = 0; i < 5; i++) {
          const batch = callbacks;
          callbacks = [];
          now += 50;
          for (const callback of batch) callback(now);
        }
        nativeRAF(pump);
      };
      frame.requestAnimationFrame = callback => callbacks.push(callback);
      nativeRAF(pump);
    })()`);
  }
  await speedUpFlight();
  await until(student, "document.querySelector('#flight-frame').contentDocument.querySelector('#control-center').open", 14000);
  await answerQuiz(student.evaluate, "document.querySelector('#flight-frame').contentDocument");
  await student.evaluate(`(() => {
    const d = document.querySelector('#flight-frame').contentDocument;
    d.querySelector('#mission-code').value = 'velocita = 5 * 2';
    d.querySelector('#mission-run').click();
  })()`);
  await until(student, "document.querySelector('#flight-frame').contentDocument.querySelector('#mission-status').dataset.result === 'success'");
  await student.evaluate("document.querySelector('#flight-frame').contentDocument.querySelector('#mission-done').click()");
  await until(student, "document.querySelector('#player-summary').textContent.includes('punti') && Number(document.querySelector('#rank-body tr td:nth-child(3)').textContent) >= 1400");
  await parent.activate();
  await until(parent, "Number(document.querySelector('#rank-body tr td:nth-child(3)').textContent) >= 1400");
  await click(parent, '[data-option=rocks]');
  await until(parent, "document.querySelector('[data-option=rocks]').textContent.includes('Riattiva')");
  await student.activate();
  await speedUpFlight();
  const playMission = async mission => {
    const frameDocument = "document.querySelector('#flight-frame').contentDocument";
    await student.evaluate(`(() => {
      const d = ${frameDocument};
      if (d.querySelector('#viewport').dataset.state === 'PAUSED') d.querySelector('#paused-panel [data-action=resume]').click();
    })()`);
    await until(student, `${frameDocument}.querySelector('#control-center').open`, 9000).catch(async error => {
      const state = await student.evaluate(`${frameDocument}.querySelector('#viewport').dataset.state`);
      throw Error(`Missione ${mission.id}, stato ${state}. ${error.message}`);
    });
    assert.equal(await student.evaluate(`${frameDocument}.querySelector('#mission-title').textContent`), mission.title);
    if (mission.id === 2) {
      await student.evaluate(`
        const editor = ${frameDocument}.querySelector('#mission-code');
        editor.value = 'energia = 5 # bozza';
        editor.dispatchEvent(new Event('input'));
      `);
      await until(student, "Object.keys(sessionStorage).some(key => key.includes(':flight:') && sessionStorage[key].includes('energia = 5 # bozza'))");
      await student.reload();
      await until(student, `${frameDocument}?.querySelector('#control-center')?.open`, 12000);
      assert.equal(await student.evaluate(`${frameDocument}.querySelector('#mission-code').value`), 'energia = 5 # bozza');
      assert.match(await student.evaluate("document.querySelector('#participants').textContent"), /1 connessi/);
      await speedUpFlight();
    }

    await answerQuiz(student.evaluate, frameDocument);
    await student.evaluate(`
      ${frameDocument}.querySelector('#mission-code').value = ${JSON.stringify(mission.solution)};
      ${frameDocument}.querySelector('#mission-run').click();
    `);
    await until(student, `${frameDocument}.querySelector('#mission-status').dataset.result === 'success'`);
    await student.evaluate(`${frameDocument}.querySelector('#mission-done').click()`);
  };
  for (const mission of missions.slice(1, 5)) await playMission(mission);
  await until(student, "document.querySelector('#flight-frame').contentDocument.querySelector('#mission-total').textContent === '5 / 22'");
  await parent.activate();
  await parent.evaluate("document.querySelector('#rank').scrollIntoView({block:'end'})");
  await capture(parent, '11-classifica');
  await browser.page('Page.reload');
  await until(parent, `document.querySelector('#pin-value')?.textContent === '${pin}'`, 12000);
  await until(parent, "document.querySelector('#host-totals').textContent.includes('5 missioni Python')");

  await until(parent, "!document.querySelector('[data-command=boss]').disabled");
  await click(parent, selectors.boss);
  await student.activate();
  await until(student, "document.querySelector('#flight-frame').contentDocument.querySelector('#viewport').dataset.state === 'FINAL_CHALLENGE'", 9000);
  await student.evaluate("document.querySelector('#flight-frame').scrollIntoView()");
  await capture(student, '08-boss');
  await until(student, "Object.keys(sessionStorage).some(key => key.includes(':flight:') && sessionStorage[key].includes('FINAL_CHALLENGE'))");
  await student.reload();
  await until(student, "document.querySelector('#flight-frame').contentDocument?.querySelector('#viewport')?.dataset.state === 'FINAL_CHALLENGE'", 9000);
  await speedUpFlight();

  await until(student, "document.querySelector('#flight-frame').contentDocument.querySelector('#viewport').dataset.state === 'VICTORY'", 13000);
  await parent.activate();
  await until(parent, "document.querySelector('#host-totals').textContent.includes('1 completati')");
  await student.activate();
  await until(student, "document.querySelector('#flight-frame').contentDocument.querySelector('#viewport').dataset.state === 'PLAYING'");
  for (const mission of missions.slice(5)) await playMission(mission);
  const readCount = id => student.evaluate(`document.querySelector('#flight-frame').contentDocument.getElementById('${id}').textContent`);
  assert.deepEqual(await Promise.all(['mission-total', 'mission-count', 'mission-bonus'].map(readCount)), ['22 / 22', '5 / 5', '17 / 17']);
  await parent.activate();
  await until(parent, "document.querySelector('#host-totals').textContent.includes('22 missioni Python')");
  await click(parent, selectors.end);
  await until(parent, "document.querySelector('#phase-label').textContent === 'Sessione terminata'");
  await until(parent, "!document.querySelector('[data-option=podium]').disabled");
  await click(parent, selectors.podium);
  for (let index = 0; index < 3; index++) {
    await until(parent, "!document.querySelector('[data-option=reveal]').disabled");
    await click(parent, selectors.reveal);
    await until(parent, `document.querySelector('[data-option=reveal]').textContent.includes('(${index + 1}/3)')`);
  }
  await until(parent, "document.querySelector('#podium-list').textContent.includes('Aurora_42')");
  await parent.evaluate("document.querySelector('#podium').scrollIntoView({block:'center'})");
  await capture(parent, '09-podio');
  const projectorURL = await until(parent, "document.querySelector('#projector-link').href");
  const projector = await tab(projectorURL.split('?')[1]);
  await projector.activate();
  await until(projector, "document.querySelector('#podium-list')?.textContent.includes('Aurora_42')");
  assert.equal(await projector.evaluate("document.querySelector('#host-controls').hidden"), true);
  assert.equal(await projector.evaluate("document.querySelector('#rank-body').textContent.includes('Aiuto richiesto')"), false);
  await capture(projector, '10-proiettore');
  assert.deepEqual(browser.errors, []);
});
