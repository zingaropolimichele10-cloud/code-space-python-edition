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
  assert.equal(await text('mission-count'), '0 / 22');
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
    assert.equal(await text('mission-title'), 'Riaccendi Aurora');
    await saveScreenshot(browser, '111-missione-01');
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
    await advance(40);
    assert.equal(await dialog(), false);
    await click('#mission-retry');
    assert.equal(await evaluate("document.querySelector('#mission-code').value"), 'velocita = 6');
    assert.equal(await evaluate("document.querySelectorAll('#mission-hints li').length"), 3);
    assert.match(await submit('velocita = 5 * 2', 'success'), /intero 10/);
    assert.equal(await text('mission-count'), '1 / 22');
    await finish();
    assert.equal(await state(), 'PLAYING');
  });

  await t.test('Potenziamenti e ordine delle quattro missioni attive', async () => {
    await advance(23);
    const x = (await paint())[0];
    await key('ArrowRight');
    await advance(3);
    await key('ArrowRight', 'keyUp');
    assert.ok((await paint())[0] - x > 45);
    for (const [title, code, count] of [
      ['Messaggio di bordo', 'print("Aurora " + "online")', '2 / 22'],
      ['Interruttore scudo', 'scudo = 2 < 3', '3 / 22'],
      ['Vernice spaziale', 'colore = "b" + "lu"', '4 / 22'],
    ]) {
      await advance(220);
      assert.equal(await text('mission-title'), title);
      await saveScreenshot(browser, '111-' + title.toLowerCase().replaceAll(' ', '-'));
      assert.equal(await state(), 'MISSION');
      await submit(code, 'success');
      assert.equal(await text('mission-count'), count);
      await finish();
    }
    assert.equal(await text('lives'), '3 / 3');
    assert.equal(await text('flight-message'), 'Aurora online');
    assert.equal(await text('shield'), 'Attivo');
    await advance(23);
    assert.equal((await paint())[2], '64,155,255');
    assert.equal(await evaluate("document.querySelector('#final-button').hidden"), false);
    await advance(220);
    assert.equal(await dialog(), true);
    assert.equal(await text('mission-title'), 'Ricarica energetica');
    await click('#mission-skip');
    assert.equal(await evaluate("document.querySelector('#final-button').hidden"), false);
  });

  await t.test('Sfida finale, vittoria, riavvii e un solo ciclo', async () => {
    await action('final');
    assert.equal(await state(), 'FINAL_CHALLENGE');
    await advance(45);
    await saveScreenshot(browser, '03-sfida-finale');
    await advance(1170);
    assert.equal(await state(), 'VICTORY');
    await saveScreenshot(browser, '03-vittoria');
    await evaluate("document.querySelector('#victory-panel [data-action=menu]').click()");
    for (let index = 0; index < 3; index++) {
      await action('tutorial');
      await action('start');
      assert.deepEqual((await hud()).slice(0, 3), ['3 / 3', '0', '4 / 22']);
      await action('pause');
      await evaluate("document.querySelector('#paused-panel [data-action=menu]').click()");
    }
    assert.equal(await evaluate('peakFrames'), 1);
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-space:missioni-1.1:progress:v3')).completed"), [1, 2, 3, 4]);
    await browser.page('Page.reload');
    await waitForPage(browser);
    assert.equal(await text('mission-count'), '4 / 22');
  });

  await t.test('In volo: missioni 5–11, salto, recupero e strumenti di bordo', async () => {
    await click('#teacher-open');
    await click('#teacher-demo');
    await evaluate("document.querySelector('#teacher').close()");
    await action('tutorial');
    await action('start');
    await click('#mission-retry');
    assert.equal(await text('mission-title'), 'Ricarica energetica');
    await saveScreenshot(browser, '111-missione-05');
    await click('#mission-hint');
    assert.doesNotMatch(await text('mission-hints'), /energia = energia \+ 20/);
    await submit('energia = 40\nenergia = 60', 'error');
    await submit('energia = 40\nenergia = energia + 20', 'success');
    assert.deepEqual(await evaluate("[...document.querySelectorAll('#mission-instruments meter')].map(meter => meter.value)"), [40, 60]);
    await finish();
    const challenges = [
      ['Riparazione dello scafo', 'scafo = 100 - danni', /65/],
      ['Potenziamento laser', 'danno = 10 * livello', /Potenza 20/],
      ['Distribuzione delle risorse', 'per_motore = energia_totale // motori', /Motore 3 · 20/],
      ['Segnale extraterrestre', 'messaggio = "Ciao " + nome', /Ciao Vega/],
      ['Rapporto di bordo', 'print("Vite: " + str(vite))', /Vite: 3/],
      ['Scudo intelligente', 'scudo = False\nif vite < 3:\n    scudo = True', /2 vite · Accesa.*3 vite · Spenta.*4 vite · Spenta/],
    ];
    for (const [title, code, expected] of challenges) {
      await advance(230);
      assert.equal(await state(), 'MISSION');
      assert.equal(await text('mission-title'), title);
      await saveScreenshot(browser, '111-' + title.toLowerCase().replaceAll(' ', '-'));
      await source(code);
      await evaluate("document.querySelector('#mission-code').dispatchEvent(new Event('input', { bubbles: true }))");
      await submit(code, 'success');
      assert.match(await text('mission-instruments'), expected);
      if (title === 'Scudo intelligente') await saveScreenshot(browser, 'fase2-scudo-intelligente');
      await finish();
    }
    assert.equal(await text('mission-count'), '11 / 22');
    assert.equal(await text('flight-message'), 'Vite: 3');
    assert.equal(await evaluate('peakFrames'), 1);
  });

  await t.test('In volo: decisioni e cicli dalle missioni 12–17', async () => {
    const lessons = await evaluate(`import('./js/missions/catalog.mjs').then(({ missions }) => missions.slice(11, 17))`);
    const labels = [/49 unità · ↗ Devia.*50 unità · ↑ Continua/, /19 unità · rosso.*20 unità · giallo.*50 unità · verde/,
      /2 vite · 21 energia · Via libera.*2 vite · 20 energia · In attesa/, /Impulso 1.*Impulso 2.*Impulso 3/,
      /Giro 1 · 1 unità.*Giro 5 · 15 unità/, /321Fine · 0.*Da 0 · nessun giro/];
    for (const [index, lesson] of lessons.entries()) {
      await advance(230);
      assert.equal(await state(), 'MISSION');
      assert.equal(await text('mission-title'), lesson.titolo);
      await saveScreenshot(browser, '111-missione-' + lesson.id);
      if (lesson.id === 12) {
        await click('#mission-skip');
        await click('#mission-retry');
        assert.equal(await text('mission-title'), lesson.titolo);
        for (let i = 0; i < 2; i++) {
          await click('#mission-hint');
          assert.doesNotMatch(await text('mission-hints'), /rotta = "devia"/);
        }
        await click('#mission-hint');
        assert.match(await text('mission-hints'), /rotta = "devia"/);
      }
      await source(lesson.soluzioneEsempio);
      await evaluate("document.querySelector('#mission-code').dispatchEvent(new Event('input', { bubbles: true }))");
      await submit(lesson.soluzioneEsempio, 'success');
      assert.match(await text('mission-instruments'), labels[index]);
      if (lesson.id >= 15) {
        assert.equal(await evaluate("document.querySelectorAll('#mission-instruments .calc-step').length"),
          lesson.scenariDiTest[0].output.length);
      }
      if (lesson.id === 16 && process.env.CODESPACE_SCREENSHOTS) {
        await evaluate(`Promise.all(document.querySelector('#mission-instruments')
          .getAnimations({ subtree: true }).map(animation => animation.finished))`);
        await saveScreenshot(browser, 'fase3-generatore-automatico');
      }
      await finish();
    }
    assert.equal(await text('mission-count'), '17 / 22');
    assert.equal(await text('flight-message'), '3\n2\n1');
    assert.equal(await evaluate('peakFrames'), 1);
  });

  await t.test('In volo: inventario, debug, funzioni e accesso Omega fino a 22/22', async () => {
    const lessons = await evaluate(`import('./js/missions/catalog.mjs').then(({ missions }) => missions.slice(17))`);
    const expected = [/cavofiltrokit3 oggetti/, /cavo · carburante.*Carburante presente.*Stiva vuota.*assente/,
      /Sistemi pronti.*Terminale in attesa/, /Scudo attivo.*Scudo spento/, /2 \+ 3 \+ 4 → 9.*2 \+ 3 \+ 5 → 10/];
    for (const [index, lesson] of lessons.entries()) {
      await advance(230);
      assert.equal(await state(), 'MISSION');
      assert.equal(await text('mission-title'), lesson.titolo);
      await saveScreenshot(browser, '111-missione-' + lesson.id);
      if (lesson.id === 19) {
        await click('#mission-skip');
        await click('#mission-retry');
        assert.equal(await text('mission-title'), lesson.titolo);
      }
      assert.equal(await evaluate("document.querySelector('#mission-final').hidden"), true);
      await source(lesson.soluzioneEsempio);
      await evaluate("document.querySelector('#mission-code').dispatchEvent(new Event('input', { bubbles: true }))");
      await submit(lesson.soluzioneEsempio, 'success');
      assert.equal(await text('mission-count'), `${lesson.id} / 22`);
      assert.match(await text('mission-instruments'), expected[index]);
      if (lesson.id === 22) {
        for (const [width, height] of [[1024, 768], [1280, 720], [1366, 768], [1920, 1080]]) {
          await browser.page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
          assert.equal(await evaluate(`(() => {
            const button = document.querySelector('#mission-final');
            button.scrollIntoView({ block: 'nearest' });
            const bounds = button.getBoundingClientRect();
            const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
            return bounds.width > 0 && bounds.bottom <= innerHeight && hit === button;
          })()`), true, `${width} × ${height}`);
          if (width === 1366 || width === 1920) await saveScreenshot(browser, `fase4-omega-${width}x${height}`);
        }
        assert.equal(await evaluate("document.querySelector('#mission-final').hidden"), false);
        await click('#mission-final');
        assert.equal(await state(), 'FINAL_CHALLENGE');
      } else await finish();
      if (lesson.id === 21) assert.equal(await text('shield'), 'Attivo');
    }
    assert.equal(await evaluate('peakFrames'), 1);
    await browser.page('Page.reload');
    await waitForPage(browser);
    assert.equal(await text('mission-count'), '22 / 22');
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-space:missioni-1.1:progress:v3')).completed"),
      Array.from({ length: 22 }, (_, index) => index + 1));
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
    const progress = JSON.parse(localStorage.getItem('code-space:missioni-1.1:progress:v3'));
    progress.completed = [1,2,3,4];
    progress.skipped = [];
    localStorage.setItem('code-space:missioni-1.1:progress:v3', JSON.stringify(progress));
    sessionStorage.setItem('test:checkpoint', '1');
  `);
  await browser.page('Page.reload');
  await waitForPage(browser);
  assert.deepEqual(await evaluate(`(() => {
    document.querySelector('[data-action=tutorial]').click();
    document.querySelector('[data-action=start]').click();
    document.querySelector('#final-button').click();
    advance(1220);
    return [document.querySelector('#viewport').dataset.state, JSON.parse(localStorage.getItem('code-space:missioni-1.1:progress:v3')).completed];
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

test('Spazio nel volo e nell’editor, dati protetti e riscontri della missione 06', async t => {
  const browser = await openBrowser('', { beforeLoad: controlledFrames + `
    window.shotDraws = 0;
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      if (args[2] === 4 && args[3] === 13 && this.fillStyle === '#63dfff') shotDraws++;
      return fillRect.apply(this, args);
    };
  ` });
  t.after(browser.close);
  await waitForPage(browser);
  const { evaluate } = browser;
  const key = type => browser.page('Input.dispatchKeyEvent', {
    type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, ...(type === 'keyDown' && { text: ' ' }),
  });
  const tap = async () => {
    await key('keyDown');
    await key('keyUp');
    await evaluate('advance(1)');
  };
  await evaluate(`(() => {
    const q = selector => document.querySelector(selector);
    q('[data-action=tutorial]').click();
    q('#tutorial-panel [data-action=start]').click();
    q('#space').focus();
    advance(2);
  })()`);
  await tap();
  assert.ok(await evaluate('shotDraws > 0'));
  await evaluate(`(() => {
    document.querySelector('#teacher-open').click();
    document.querySelector('#teacher-mission').value = '6';
    document.querySelector('#teacher-launch').click();
    advance(1);
  })()`);
  assert.equal(await evaluate("document.querySelector('#mission-board-code').textContent"), 'danni = 35');
  assert.equal(await evaluate("document.querySelector('#mission-board-code').isContentEditable"), false);
  assert.equal(await evaluate("document.querySelector('#line-numbers span').textContent"), '2');
  assert.equal(await evaluate("document.querySelector('#mission-code').value"), 'scafo = 100 - 12');
  await evaluate("document.querySelector('#mission-code').setSelectionRange(0,0); shotDraws = 0;");
  await tap();
  assert.match(await evaluate("document.querySelector('#mission-code').value"), /^ /);
  // La simulazione in missione può ridisegnare il proiettile precedente, ma non spostarlo.
  const canvas = () => evaluate("document.querySelector('#space').toDataURL()");
  const frozen = await canvas();
  await evaluate('advance(12)');
  assert.equal(await canvas(), frozen);
  const submit = code => evaluate(`new Promise(resolve => {
    const editor = document.querySelector('#mission-code');
    const status = document.querySelector('#mission-status');
    const observer = new MutationObserver(() => {
      if (['error','success'].includes(status.dataset.result)) {
        observer.disconnect(); resolve(status.textContent);
      }
    });
    observer.observe(status, {attributes:true, childList:true});
    editor.value = ${JSON.stringify(code)};
    editor.dispatchEvent(new Event('input', {bubbles:true}));
    document.querySelector('#mission-run').click();
  })`);
  assert.match(await submit('scafo = 100 - 12'), /Riga 2.*danni.*cambia/i);
  assert.match(await evaluate("document.querySelector('#mission-cases').textContent"), /danni = 35 → scafo = 88/);
  await submit('scafo = 100 - danni');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('#mission-instruments meter')].map(bar => bar.value)"), [100, 35, 65]);
  assert.match(await evaluate("document.querySelector('#mission-cases').textContent"), /danni = 12 → scafo = 88/);
  await saveScreenshot(browser, '111-missione-06-verificata');
  await evaluate("document.querySelector('#mission-done').click(); advance(18); shotDraws = 0;");
  assert.equal(await evaluate("document.activeElement.id"), 'space');
  await tap();
  assert.ok(await evaluate('shotDraws > 0'));
  for (let id = 1; id <= 22; id++) {
    await evaluate(`(() => {
      const q = selector => document.querySelector(selector);
      q('#teacher-open').click();
      q('#teacher-mission').value = '${id}';
      q('#teacher-launch').click();
      q('#mission-skip').click();
      advance(18);
      shotDraws = 0;
    })()`);
    assert.equal(await evaluate("document.activeElement.id"), 'space', `Missione ${id}`);
    await tap();
    assert.ok(await evaluate('shotDraws > 0'), `Sparo dopo la missione ${id}`);
  }
  assert.deepEqual(browser.errors, []);
});
