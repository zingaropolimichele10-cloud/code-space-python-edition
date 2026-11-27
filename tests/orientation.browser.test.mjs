import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const clock = `
  (() => {
    let age = 0;
    let pending;
    window.requestAnimationFrame = callback => { pending = callback; return 1; };
    window.fly = frames => {
      for (let frame = 0; frame < frames; frame++) {
        const callback = pending;
        pending = undefined;
        callback?.(age += 50);
      }
    };
    Math.random = () => .08;
  })();
`;

async function loaded(browser) {
  await browser.evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else addEventListener('load', resolve, { once: true });
  })`);
}

test('Percorso di orientamento, editor nativo, audio, disposizione e controlli docente', async t => {
  const browser = await openBrowser('', { width: 1366, height: 768, beforeLoad: clock + `
    window.audioStarts = 0;
    const NativeAudio = window.AudioContext;
    window.AudioContext = class extends NativeAudio {
      constructor() { super(); window.audioStarts++; }
    };
  ` });
  t.after(browser.close);
  const { evaluate, page } = browser;
  await loaded(browser);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const text = id => evaluate(`document.getElementById('${id}').textContent`);
  const state = () => evaluate("document.getElementById('viewport').dataset.state");
  const save = () => evaluate("JSON.parse(localStorage.getItem('code-space:missioni-1.1:progress:v3'))");
  const wait = expression => evaluate(`new Promise((resolve, reject) => {
    const start = performance.now();
    const timer = setInterval(() => {
      if (${expression}) { clearInterval(timer); resolve(true); }
      else if (performance.now() - start > 3500) { clearInterval(timer); reject(new Error('Stato atteso assente')); }
    }, 20);
  })`);
  const change = (id, value) => evaluate(`(() => {
    const control = document.getElementById(${JSON.stringify(id)});
    control[control.type === 'checkbox' ? 'checked' : 'value'] = ${JSON.stringify(value)};
    control.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  async function key(key, code, windowsVirtualKeyCode, modifiers = 0) {
    const event = { key, code, windowsVirtualKeyCode, modifiers };
    await page('Input.dispatchKeyEvent', { ...event, type: 'keyDown', ...(key === 'Enter' ? { text: '\r' } : {}) });
    await page('Input.dispatchKeyEvent', { ...event, type: 'keyUp' });
  }
  async function resize(width, height) {
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await evaluate('fly(1)');
  }
  async function verifyLayout() {
    assert.deepEqual(await evaluate(`(() => {
      const rect = id => document.getElementById(id).getBoundingClientRect();
      const dlg = document.querySelector('dialog[open]');
      const fits = box => box.left >= -1 && box.right <= innerWidth + 1;
      const bounds = dlg?.getBoundingClientRect();
      return [document.documentElement.scrollWidth <= innerWidth + 1, fits(rect('viewport')),
        !bounds || (fits(bounds) && bounds.top >= 0 && bounds.bottom <= innerHeight + 1),
        !dlg || dlg.scrollWidth <= dlg.clientWidth + 1];
    })()`), [true, true, true, true]);
  }
  async function capture(name) {
    for (const [width, height] of [[1366,768], [1920,1080]]) {
      await resize(width, height);
      await verifyLayout();
      assert.equal(await evaluate(`(() => {
        const canvas = document.getElementById('space');
        const pixel = canvas.getContext('2d').getImageData(8, 8, 1, 1).data;
        return pixel[0] + pixel[1] + pixel[2] > 0;
      })()`), true);
      const folder = process.env.CODESPACE_ORIENTATION_SCREENSHOTS;
      if (folder) {
        await mkdir(folder, { recursive: true });
        await writeFile(join(folder, `${width}x${height}-${name}.png`), await browser.screenshot());
      }
    }
    await resize(1366, 768);
  }

  await t.test('Menu, impostazioni, tastiera, audio e risoluzioni', async () => {
    assert.equal(await state(), 'MENU');
    assert.equal(await text('mute'), 'Audio disattivato');
    assert.equal(await evaluate('audioStarts'), 0);
    await capture('01-menu');
    for (const [width, height] of [[1024,768], [1280,720], [430,700]]) {
      await resize(width, height);
      await verifyLayout();
    }
    await resize(1366,768);
    await evaluate("document.getElementById('settings-open').focus()");
    await key('Enter','Enter',13);
    assert.equal(await evaluate("document.getElementById('settings').open"), true);
    await evaluate(`const volume = document.getElementById('volume'); volume.value = '33'; volume.dispatchEvent(new Event('input'));`);
    await capture('02-impostazioni');
    await key('Escape','Escape',27);
    await evaluate("document.getElementById('mute').focus()");
    await key('Enter','Enter',13);
    await wait('audioStarts === 1');
    assert.equal(await text('mute'), 'Audio attivo');
    await click('#mute');
    await wait("JSON.parse(localStorage.getItem('code-space:missioni-1.1:progress:v3'))?.audio?.volume === 0.33");
    assert.deepEqual((await save()).audio, { enabled: false, volume: .33 });
  });

  await t.test('Tutorial, Centro di prova, copia/incolla, frecce e rientro', async () => {
    await click('[data-action=tutorial]');
    assert.match(await text('tutorial-text'), /quattro frecce/);
    await capture('03-tutorial');
    await click('#tutorial-next');
    assert.match(await text('tutorial-text'), /Aggira/);
    await click('#tutorial-next');
    assert.match(await text('tutorial-text'), /stella dorata/);
    await click('#tutorial-next');
    assert.match(await text('tutorial-text'), /scritta PYTHON/);
    await click('#tutorial-next');
    assert.match(await text('mission-id'), /Prova del tutorial/);
    await click('#mission-hint');
    assert.match(await text('mission-hints'), /variabile/);
    await evaluate(`const editor = document.getElementById('mission-code'); editor.focus(); editor.select();`);
    await key('ArrowLeft','ArrowLeft',37);
    assert.equal(await evaluate('editor.selectionStart'), 0);
    await page('Browser.grantPermissions', { origin: browser.origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
    await evaluate("navigator.clipboard.writeText('velocita = 5 * 2\u005cnprint(velocita)')".replace('\n', '\\n'));
    await evaluate('editor.select()');
    await key('v','KeyV',86,2);
    await wait("editor.value.includes('print')");
    assert.deepEqual(await evaluate("[...document.querySelectorAll('#line-numbers span')].map(row => row.textContent)"), ['1', '2']);
    await evaluate('editor.select()');
    await key('c','KeyC',67,2);
    assert.equal(await evaluate('navigator.clipboard.readText()'), 'velocita = 5 * 2\nprint(velocita)');
    await evaluate('editor.setSelectionRange(17,17)');
    await click('#mission-indent');
    assert.match(await evaluate('editor.value'), /\n    print/);
    await evaluate("editor.value = 'velocita = 5 * 2'; editor.dispatchEvent(new Event('input'));");
    await click('#mission-run');
    await wait("document.getElementById('mission-status').dataset.result === 'success'");
    assert.equal(await text('mission-count'), '0 / 11');
    await click('#mission-done');
    assert.equal(await state(), 'TUTORIAL');
    await click('#tutorial-panel [data-action=start]');
    await evaluate('fly(110)');
    await capture('05-volo');
    await evaluate('fly(120)');
    assert.equal(await state(), 'MISSION');
    await evaluate(`editor.value = ${JSON.stringify('velocita = 6\nprint(velocita)')}; editor.dispatchEvent(new Event('input'));`);
    await click('#mission-run');
    await wait("document.getElementById('mission-status').dataset.result === 'error'");
    assert.equal(await text('mission-output'), '6\n');
    await click('#mission-hint');
    await capture('04-centro');
    await click('#mission-skip');
    assert.deepEqual((await save()).skipped, [1]);
    assert.equal((await save()).drafts[1], 'velocita = 6\nprint(velocita)');
    assert.ok((await save()).best >= 25);
  });

  await t.test('Continua, soluzioni, accesso diretto, demo, finale libero e reset', async () => {
    await page('Page.reload');
    await loaded(browser);
    assert.equal(await evaluate("document.getElementById('continue').hidden"), false);
    await click('#continue');
    assert.equal(await state(), 'PLAYING');
    assert.equal(await evaluate("document.getElementById('final-button').hidden"), false);
    await click('#mission-retry');
    assert.equal(await evaluate("document.getElementById('mission-code').value"), 'velocita = 6\nprint(velocita)');
    await click('#mission-skip');
    await click('#final-button');
    assert.equal(await state(), 'FINAL_CHALLENGE');
    assert.match(await text('flight-note'), /60 s/);
    await evaluate('fly(90)');
    await capture('07-finale');
    await click('#teacher-open');
    await change('teacher-mission', '4');
    await click('#teacher-solution');
    assert.match(await text('teacher-answer'), /colore = "blu"/);
    await click('#teacher-unlock');
    await change('teacher-difficulty', 'hard');
    await change('teacher-duration', '5');
    await click('#teacher-final');
    assert.match(await text('teacher-status'), /fra 10 e 180/);
    await change('teacher-duration', '12');
    await change('teacher-demo', true);
    await change('teacher-rocks', false);
    await change('teacher-light', true);
    await capture('06-docente');
    await click('#teacher-launch');
    assert.match(await text('mission-title'), /Vernice spaziale/);
    await click('#mission-skip');
    assert.equal(await evaluate("document.querySelector('#open-unlocked').hidden"), false);
    assert.deepEqual((await save()).skipped, [1, 4]);
    await click('#teacher-open');
    assert.equal(await evaluate("document.querySelector('#teacher-difficulty').value"), 'hard');
    await click('#teacher-final');
    assert.equal(await state(), 'FINAL_CHALLENGE');
    assert.match(await text('flight-note'), /12 s/);
    assert.match(await text('flight-status'), /Demo/);
    await evaluate('fly(245)');
    assert.equal(await state(), 'VICTORY');
    assert.match(await text('victory-missions'), /0 su 11/);
    await capture('08-vittoria');
    await click('#victory-recover');
    assert.equal(await state(), 'MISSION');
    await click('#mission-skip');
    await click('#teacher-open');
    await click('#teacher-reset');
    await click('#teacher-confirm-no');
    assert.deepEqual((await save()).skipped, [1, 4]);
    await click('#teacher-reset');
    await click('#teacher-confirm-yes');
    assert.deepEqual((await save()).skipped, []);
    assert.deepEqual((await save()).drafts, {});
    assert.equal((await save()).best, 0);
    assert.equal((await save()).checkpoint, null);
    assert.equal((await save()).light, true);
    await click('#teacher-new');
    await click('#teacher-confirm-yes');
    assert.equal(await state(), 'TUTORIAL');
    assert.deepEqual(browser.errors, []);
    assert.ok(browser.network.some(url => url.endsWith('/workers/python.worker.js')));
    assert.ok(browser.network.every(url => url.startsWith(browser.origin + browser.prefix)));
  });
});

test('Avvio e volo con LocalStorage bloccato o corrotto', async () => {
  for (const beforeLoad of [
    "Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloccato'); } });",
    "localStorage.setItem('code-space:missioni-1.1:progress:v3', '{errore');",
  ]) {
    const browser = await openBrowser('', { beforeLoad });
    try {
      await loaded(browser);
      assert.equal(await browser.evaluate("document.getElementById('continue').hidden"), true);
      assert.equal(await browser.evaluate(`(() => {
        document.querySelector('[data-action=tutorial]').click();
        document.querySelector('[data-action=start]').click();
        return document.querySelector('#viewport').dataset.state;
      })()`), 'PLAYING');
      assert.deepEqual(browser.errors, []);
    } finally { await browser.close(); }
  }
});
