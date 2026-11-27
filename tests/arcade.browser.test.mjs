import { answerQuiz } from './quiz-fixture.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const clock = `(() => {
  let callback;
  let now = 0;
  window.requestAnimationFrame = fn => { callback = fn; };
  window.advance = count => { for (let i = 0; i < count; i++) callback?.(now += 50); };
  Math.random = () => .5;
})()`;

test('Browser: combattimento, segnali del drone e nuova missione if', async t => {
  const browser = await openBrowser('', { beforeLoad: clock, width: 1366, height: 768 });
  t.after(browser.close);
  const { evaluate, page } = browser;
  await evaluate(`new Promise(resolve => document.readyState === 'complete'
    ? resolve() : addEventListener('load', resolve, { once: true }))`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const text = id => evaluate(`document.getElementById('${id}').textContent`);
  const folder = process.env.CODESPACE_110_SHOTS;
  async function shot(name) {
    if (!folder) return;
    await mkdir(folder, { recursive: true });
    await writeFile(`${folder}/${name}.png`, await browser.screenshot());
  }
  await click('[data-action=tutorial]');
  await click('#tutorial-panel [data-action=start]');
  const space = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32 };
  await page('Input.dispatchKeyEvent', { type: 'keyDown', ...space });
  await evaluate('advance(90)');
  assert.ok(Number(await text('score')) >= 15);
  assert.match(await text('sector-label'), /Decollo/);
  await shot('01-combattimento');
  await page('Input.dispatchKeyEvent', { type: 'keyUp', ...space });

  await click('#teacher-open');
  await evaluate(`(() => {
    const choice = document.getElementById('teacher-mission');
    document.getElementById('teacher-unlock').click();
    choice.value = '11';
    choice.dispatchEvent(new Event('change'));
  })()`);
  await click('#teacher-launch');
  assert.equal(await evaluate("document.querySelector('#mission-code').value"), 'scudo = False\nif vite < 3:\n    scudo = False');
  assert.match(await text('mission-panel'), /Con 2 vite lo scudo si accende. Con 3 o 4 vite resta spento./);
  await answerQuiz(evaluate);
  await shot('02-condizioni');
  const verify = source => evaluate(`(async () => {
    const editor = document.getElementById('mission-code');
    const status = document.getElementById('mission-status');
    editor.value = ${JSON.stringify(source)};
    editor.dispatchEvent(new Event('input'));
    document.getElementById('mission-run').click();
    for (let tick = 0; tick < 180; tick++) {
      if (['error','success'].includes(status.dataset.result)) return [status.dataset.result, status.textContent];
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw Error('Skulpt senza risposta');
  })()`);
  assert.equal((await verify('scudo = True'))[0], 'error');
  assert.equal((await verify('scudo = False\nif 3 > vite:\n    scudo = 1 < 2'))[0], 'success');
  await click('#mission-done');
  await click('#final-button');
  await evaluate('advance(65)');
  assert.match(await text('boss-label'), /Drone ostile.*26\/26/);
  assert.match(await text('arcade-notice'), /Attacco in arrivo/);
  await shot('03-drone');
  assert.deepEqual(browser.errors, []);
});
