import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const setup = `(() => {
  let callback;
  let now = 0;
  Math.random = () => .5;
  window.requestAnimationFrame = fn => { callback = fn; };
  window.advance = count => {
    for (let i = 0; i < count; i++) callback?.(now += 50);
  };
})()`;

test('Revisione finale: testo letterale, limite risorse, annullamento e cambio di visibilità', async t => {
  const browser = await openBrowser('', { beforeLoad: setup, width: 1366, height: 768 });
  t.after(browser.close);
  const { evaluate } = browser;
  await evaluate(`new Promise(resolve => document.readyState === 'complete'
    ? resolve() : addEventListener('load', resolve, { once: true }))`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const state = () => evaluate("document.querySelector('#viewport').dataset.state");
  const folder = process.env.CODESPACE_FINAL_SHOTS;
  async function screenshot(name) {
    if (!folder) return;
    await mkdir(folder, { recursive: true });
    await writeFile(`${folder}/${name}.png`, await browser.screenshot());
  }
  async function code(source) {
    await evaluate(`(() => {
      const editor = document.getElementById('mission-code');
      editor.value = ${JSON.stringify(source)};
      editor.dispatchEvent(new Event('input'));
    })()`);
  }
  async function result() {
    return evaluate(`new Promise((resolve, reject) => {
      const s = document.getElementById('mission-status');
      const from = performance.now();
      const timer = setInterval(() => {
        if (['success','error'].includes(s.dataset.result)) {
          clearInterval(timer);
          resolve({ status: s.dataset.result, text: s.textContent, output: document.getElementById('mission-output').textContent });
        } else if (performance.now() - from > 5000) {
          clearInterval(timer);
          reject(Error(s.textContent));
        }
      }, 20);
    })`);
  }
  await evaluate('advance(1)');
  await screenshot('01-menu');
  await click('[data-action=tutorial]');
  await evaluate('advance(1)');
  await screenshot('02-tutorial');
  await click('#tutorial-panel [data-action=start]');
  await evaluate('advance(90)');
  await screenshot('03-volo');
  await evaluate(`Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));`);
  assert.equal(await state(), 'PAUSED');
  await evaluate("delete document.hidden");
  await click('[data-action=resume]');
  await evaluate('advance(130)');
  assert.equal(await state(), 'MISSION');
  await screenshot('04-centro');
  await click('#mission-hint');
  await screenshot('05-indizi');

  const markup = '<img src=x onerror="window.executed=true"><script>window.executed=true</script>';
  await code(`print(${JSON.stringify(markup)})`);
  await click('#mission-run');
  assert.equal((await result()).output, markup + '\n');
  assert.equal(await evaluate("document.querySelector('#mission-output').childElementCount"), 0);
  assert.notEqual(await evaluate('window.executed'), true);

  await code('testo = "a" * 65537');
  await click('#mission-run');
  assert.match((await result()).text, /troppe risorse/);
  await code('valori = [0]\nvalori *= 65537');
  await click('#mission-run');
  assert.match((await result()).text, /troppe risorse/);
  await code('x = 1 << 4097');
  await click('#mission-run');
  assert.match((await result()).text, /troppe risorse/);
  await code('if True\n    print(1)');
  await click('#mission-run');
  assert.match((await result()).text, /sintassi/i);
  await screenshot('06-errore');

  await code('velocita = 10');
  await evaluate(`(() => {
    const editor = document.getElementById('mission-code');
    document.getElementById('mission-run').click();
    editor.value = 'velocita = 5';
    editor.dispatchEvent(new Event('input'));
  })()`);
  assert.equal(await evaluate("document.getElementById('mission-run').disabled"), false);
  assert.equal(await evaluate("document.getElementById('mission-count').textContent"), '0 / 11');
  await code('while True:\n    pass');
  await evaluate("document.getElementById('mission-run').click(); document.getElementById('mission-skip').click();");
  assert.equal(await state(), 'PLAYING');
  await click('#mission-retry');
  await code('velocita = 5 * 2');
  await click('#mission-run');
  assert.equal((await result()).status, 'success');
  await screenshot('07-premio');
  await click('#mission-done');
  await evaluate('advance(650)');
  assert.equal(await state(), 'GAME_OVER');
  await screenshot('08-game-over');
  await click('[data-action=checkpoint]');
  await click('#teacher-open');
  await screenshot('09-docente');
  await evaluate(`(() => {
    const demo = document.getElementById('teacher-demo');
    demo.checked = true;
    demo.dispatchEvent(new Event('change'));
    const duration = document.getElementById('teacher-duration');
    duration.value = 10;
    duration.dispatchEvent(new Event('change'));
  })()`);
  await click('#teacher-final');
  await evaluate('advance(10)');
  assert.equal(await state(), 'FINAL_CHALLENGE');
  await screenshot('10-finale');
  await evaluate('advance(200)');
  assert.equal(await state(), 'VICTORY');
  await screenshot('11-vittoria');
  assert.deepEqual(browser.errors, []);
  assert.ok(browser.network.every(url => url.startsWith(browser.origin + browser.prefix)));
});
