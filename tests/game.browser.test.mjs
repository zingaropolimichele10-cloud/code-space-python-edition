import { missions } from '../js/missions/catalog.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const controlledFrames = `
  let now = 0;
  let queue = [];
  window.peakFrames = 0;
  window.requestAnimationFrame = callback => {
    queue.push(callback);
    window.peakFrames = Math.max(window.peakFrames, queue.length);
    return queue.length;
  };
  window.advance = (frames, interval = 50) => {
    for (let i = 0; i < frames; i++) {
      const pending = queue;
      queue = [];
      now += interval;
      for (const frame of pending) frame(now);
    }
  };
  Math.random = () => 0.08;
`;

async function waitForPage(browser) {
  await browser.evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else addEventListener('load', resolve, { once: true });
  })`);
}
async function saveScreenshot(browser, name) {
  const directory = process.env.CODESPACE_SCREENSHOTS;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, name + '.png'), await browser.screenshot());
}

test('Arcade e missioni nel browser sotto il percorso GitHub Pages', async t => {
  const browser = await openBrowser('', { beforeLoad: controlledFrames });
  t.after(browser.close);
  await waitForPage(browser);
  const { evaluate } = browser;
  const state = () => evaluate("document.querySelector('#viewport').dataset.state");
  const dialog = () => evaluate("document.querySelector('#control-center').open");
  const text = id => evaluate(`document.getElementById('${id}').textContent`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const advance = frames => evaluate(`advance(${frames})`);
  const key = (name, type = 'keyDown') => browser.page('Input.dispatchKeyEvent', {
    type, key: name, code: name,
    windowsVirtualKeyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[name],
  });
  const action = name => click(`[data-action="${name}"]`);
  const source = value => evaluate(`document.querySelector('#mission-code').value = ${JSON.stringify(value)}`);
  const hud = async () => Promise.all(['lives', 'score', 'mission-count', 'shield'].map(text));
  const submit = async (code, expected) => {
    await source(code);
    const result = await evaluate(`new Promise((resolve, reject) => {
      const status = document.querySelector('#mission-status');
      const timer = setTimeout(() => { observer.disconnect(); reject(new Error(status.textContent)); }, 5000);
      const observer = new MutationObserver(() => {
        if (!['success', 'error'].includes(status.dataset.result)) return;
        clearTimeout(timer);
        observer.disconnect();
        resolve({ result: status.dataset.result, message: status.textContent });
      });
      observer.observe(status, { childList: true, attributes: true });
      document.querySelector('#mission-run').click();
    })`);
    assert.equal(result.result, expected, result.message);
    return result.message;
  };
  const finish = () => click('#mission-done');
  const paint = () => evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    const { width, height } = canvas;
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const rgb = pixels.slice(offset, offset + 3).join(',');
      if (rgb === '239,120,106' || rgb === '64,155,255') {
        const i = offset / 4;
        return [i % width, Math.floor(i / width), rgb];
      }
    }
    return null;
  })()`);

  await t.test('Menu, tutorial, Canvas e grafica leggera', async () => {
    assert.equal(await state(), 'MENU');
    await advance(1);
    await saveScreenshot(browser, '02-menu');
    await action('tutorial');
    assert.equal(await state(), 'TUTORIAL');
    await advance(1);
    await saveScreenshot(browser, '02-tutorial');
    const practice = await paint();
    await key('ArrowRight');
    await advance(4);
    await key('ArrowRight', 'keyUp');
    assert.ok((await paint())[0] > practice[0] + 25);
    await action('start');
    assert.equal(await state(), 'PLAYING');
    await advance(30);
    const initial = await paint();
    assert.ok(initial);
    await key('ArrowLeft');
    await advance(5);
    await key('ArrowLeft', 'keyUp');
    assert.ok((await paint())[0] < initial[0] - 25);
    await click('#light');
    assert.equal(await evaluate("document.querySelector('#light').checked"), true);
    await advance(100);
    await saveScreenshot(browser, '02-volo');
  });

  await t.test('Perdita del focus, tasti azzerati, ripresa e ridimensionamento', async () => {
    await evaluate("document.querySelector('canvas').focus()");
    await key('ArrowUp');
    await advance(2);
    await evaluate("dispatchEvent(new Event('blur'))");
    assert.equal(await state(), 'PAUSED');
    const paused = await paint();
    await advance(12);
    assert.deepEqual(await paint(), paused);
    await action('resume');
    await advance(1);
    await key('ArrowUp', 'keyUp');
    assert.deepEqual(await paint(), paused);
    assert.equal(await state(), 'PLAYING');
    await browser.page('Emulation.setDeviceMetricsOverride', {
      width: 1920, height: 1080, deviceScaleFactor: 3, mobile: false,
    });
    await click('#light');
    const pixels = await evaluate("document.querySelector('canvas').width * document.querySelector('canvas').height");
    assert.ok(pixels <= 1_350_000);
    await browser.page('Emulation.setDeviceMetricsOverride', {
      width: 1360, height: 900, deviceScaleFactor: 1, mobile: false,
    });
  });

  await t.test('Prima stella, editor, congelamento, indizi e recupero', async () => {
    await advance(220);
    assert.equal(await state(), 'MISSION');
    assert.equal(await dialog(), true);
    assert.equal(await text('mission-title'), 'Motori fuori controllo');
    const snapshot = await paint();
    const before = await hud();
    await source('velocita = 6');
    await evaluate("document.querySelector('#mission-code').setSelectionRange(4,4)");
    await key('ArrowLeft');
    await key('ArrowLeft', 'keyUp');
    await advance(90);
    assert.equal(await evaluate("document.querySelector('#mission-code').selectionStart"), 3);
    assert.deepEqual(await paint(), snapshot);
    assert.deepEqual(await hud(), before);
    assert.match(await submit('velocita = 6', 'error'), /vale 6/);
    assert.match(await submit('velocita = True', 'error'), /Tipo errato/);
    assert.match(await submit('velocita =', 'error'), /Errore di sintassi/);
    assert.match(await submit('velocita = manca', 'error'), /Errore di esecuzione/);
    assert.match(await submit('while True:\n    pass', 'error'), /Tempo scaduto/);
    assert.deepEqual(await hud(), before);
    await submit('velocita = 6', 'error');
    for (let count = 1; count <= 3; count++) {
      await click('#mission-hint');
      assert.equal(await evaluate("document.querySelectorAll('#mission-hints li').length"), count);
    }
    assert.match(await text('mission-hints'), /velocita = 10/);
    assert.equal(await evaluate("document.querySelector('#mission-hint').disabled"), true);
    await saveScreenshot(browser, '03-centro-di-controllo');
    await browser.page('Emulation.setDeviceMetricsOverride', {
      width: 430, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    assert.equal(await evaluate(`(() => {
      const panel = document.querySelector('#control-center');
      const bounds = panel.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && panel.scrollWidth <= panel.clientWidth;
    })()`), true);
    await saveScreenshot(browser, '03-centro-mobile');
    await browser.page('Emulation.setDeviceMetricsOverride', {
      width: 1360, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await click('#mission-skip');
    assert.equal(await state(), 'PLAYING');
    await advance(30);
    assert.equal(await dialog(), false);
    await click('#mission-retry');
    assert.equal(await evaluate("document.querySelector('#mission-code').value"), 'velocita = 6');
    assert.equal(await evaluate("document.querySelectorAll('#mission-hints li').length"), 3);
    assert.match(await submit('velocita = 5 * 2', 'success'), /intero 10/);
    assert.equal(await text('mission-count'), '1 / 5');
    await finish();
    assert.equal(await state(), 'PLAYING');
  });

  await t.test('Potenziamenti, accesso ordinato e missione facoltativa', async () => {
    await advance(23);
    const x = (await paint())[0];
    await key('ArrowRight');
    await advance(3);
    await key('ArrowRight', 'keyUp');
    assert.ok((await paint())[0] - x > 45);
    for (const [title, code, count] of [
      ['Emergenza vitale', 'energia = 2 + 3', '2 / 5'],
      ['Tempesta di meteoriti', 'scudo = 2 < 3', '3 / 5'],
      ['Messaggio extraterrestre', 'messaggio = "NORD" + "-7"', '4 / 5'],
      ['Armi in avaria', 'potenza = 4 * 3', '5 / 5'],
    ]) {
      await advance(220);
      assert.equal(await text('mission-title'), title);
      assert.equal(await state(), 'MISSION');
      await submit(code, 'success');
      assert.equal(await text('mission-count'), count);
      await finish();
    }
    assert.equal(await text('lives'), '5 / 5');
    assert.equal(await text('shield'), 'Attivo');
    await advance(23);
    assert.equal((await paint())[2], '64,155,255');
    assert.equal(await evaluate("document.querySelector('#final-button').hidden"), false);
    assert.equal(await text('mission-total'), '5 / 12');
    assert.equal(await text('mission-bonus'), '0 / 7');
  });

  await t.test('Sfida finale, vittoria, riavvii e un solo ciclo', async () => {
    await action('final');
    assert.equal(await state(), 'FINAL_CHALLENGE');
    await advance(45);
    await saveScreenshot(browser, '03-sfida-finale');
    await advance(1170);
    assert.equal(await state(), 'VICTORY');
    await saveScreenshot(browser, '03-vittoria');
    assert.match(await text('victory-missions'), /Missioni totali: 5\/12.*Missioni bonus: 0\/7/);
    await click('#victory-recover');
    assert.equal(await state(), 'PLAYING');
    for (const mission of missions.slice(5)) {
      await advance(240);
      assert.equal(await state(), 'MISSION');
      assert.equal(await text('mission-title'), mission.title);
      assert.match(await text('mission-id'), /Facoltativa/);
      if (mission.id === 6 || mission.id === 8) {
        await click('#mission-skip');
        continue;
      }
      if (mission.id === 7) {
        assert.match(await submit('scudo = True', 'error'), /Con 4 vite/);
        assert.match(await submit('vite = 2\nscudo = True', 'error'), /Lascia invariato/);
      }
      await submit(mission.solution, 'success');
      await finish();
    }
    await click('#mission-retry');
    assert.match(await text('pending-missions'), /Energia critica.*Rotta sconosciuta/s);
    await click('#pending-missions li:nth-child(2) button');
    assert.equal(await text('mission-title'), missions[7].title);
    await submit(missions[7].solution, 'success');
    await finish();
    await click('#mission-retry');
    assert.equal(await text('mission-title'), missions[5].title);
    await submit(missions[5].solution, 'success');
    await finish();
    assert.equal(await text('mission-total'), '12 / 12');
    assert.equal(await text('mission-count'), '5 / 5');
    assert.equal(await text('mission-bonus'), '7 / 7');
    await action('pause');
    await evaluate("document.querySelector('#paused-panel [data-action=menu]').click()");
    for (let index = 0; index < 3; index++) {
      await action('tutorial');
      await action('start');
      assert.deepEqual((await hud()).slice(0, 3), ['5 / 5', '0', '5 / 5']);
      await action('pause');
      await evaluate("document.querySelector('#paused-panel [data-action=menu]').click()");
    }
    assert.equal(await evaluate('peakFrames'), 1);
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-space:progress:v3')).completed"), missions.map(mission => mission.id));
    await browser.page('Page.reload');
    await waitForPage(browser);
    assert.equal(await text('mission-count'), '5 / 5');
  });

  await t.test('Sottopercorso, rete locale ed errori JavaScript', async () => {
    assert.deepEqual(browser.errors, []);
    assert.equal(await evaluate('location.pathname'), browser.prefix);
    assert.ok(browser.network.some(url => url.endsWith('/workers/python.worker.js')));
    assert.ok(browser.network.some(url => url.endsWith('/vendor/skulpt/skulpt.min.js')));
    assert.ok(browser.network.every(url => url.startsWith(browser.origin + browser.prefix)));
  });
});

test('Game over nel browser e vittoria senza missione facoltativa', async t => {
  const browser = await openBrowser('', {
    beforeLoad: controlledFrames + `
      if (!sessionStorage.getItem('test:checkpoint')) Math.random = () => 0.5;
    `,
  });
  t.after(browser.close);
  await waitForPage(browser);
  const { evaluate } = browser;
  const result = await evaluate(`(() => {
    const status = () => document.querySelector('#viewport').dataset.state;
    document.querySelector('[data-action=tutorial]').click();
    document.querySelector('[data-action=start]').click();
    advance(220);
    if (status() === 'MISSION') document.querySelector('#mission-skip').click();
    advance(330);
    return [status(), document.querySelector('#lives').textContent];
  })()`);
  assert.deepEqual(result, ['GAME_OVER', '0 / 3']);
  await saveScreenshot(browser, '02-game-over');
  await evaluate("document.querySelector('[data-action=checkpoint]').click()");
  assert.equal(await evaluate("document.querySelector('#lives').textContent"), '3 / 3');
  assert.equal(await evaluate("document.querySelector('#viewport').dataset.state"), 'PLAYING');
  assert.equal(await evaluate("document.querySelector('#mission-retry').hidden"), false);

  await evaluate(`
    const progress = JSON.parse(localStorage.getItem('code-space:progress:v3'));
    progress.completed = [1,2,3,4];
    progress.skipped = [];
    localStorage.setItem('code-space:progress:v3', JSON.stringify(progress));
    sessionStorage.setItem('test:checkpoint', '1');
  `);
  await browser.page('Page.reload');
  await waitForPage(browser);
  assert.deepEqual(await evaluate(`(() => {
    document.querySelector('[data-action=tutorial]').click();
    document.querySelector('[data-action=start]').click();
    document.querySelector('#final-button').click();
    advance(1220);
    return [document.querySelector('#viewport').dataset.state, JSON.parse(localStorage.getItem('code-space:progress:v3')).completed];
  })()`), ['VICTORY', [1, 2, 3, 4]]);
  assert.deepEqual(browser.errors, []);
});

test('Campionamento requestAnimationFrame reale in Chromium', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  await waitForPage(browser);
  const data = await browser.evaluate(`new Promise(resolve => {
    document.querySelector('[data-action=tutorial]').click();
    document.querySelector('[data-action=start]').click();
    const intervals = [];
    let first;
    let previous;
    function sample(now) {
      first ??= now;
      if (previous !== undefined) intervals.push(now - previous);
      previous = now;
      if (now - first < 2000) requestAnimationFrame(sample);
      else {
        intervals.sort((a, b) => a - b);
        resolve({ frames: intervals.length, elapsed: now - first,
          median: intervals[Math.floor(intervals.length / 2)],
          p95: intervals[Math.floor(intervals.length * .95)] });
      }
    }
    requestAnimationFrame(sample);
  })`);
  assert.ok(data.frames > 0 && data.elapsed >= 2000);
  assert.deepEqual(browser.errors, []);
  t.diagnostic(`${browser.version}, 1360 × 900, ${data.frames} intervalli in ${data.elapsed.toFixed(1)} ms, mediana ${data.median.toFixed(1)} ms, p95 ${data.p95.toFixed(1)} ms`);
});
