import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const alternatives = [
  'velocita = 5 * 2', 'energia = 10 // 2', 'scudo = 5 > 4', 'messaggio = "NORD" + "-" + str(7)',
  'potenza = 4 + 4 + 4', 'motori, armi, difese = 2, 2, 8', 'scudo = vite < 3',
  'rotta = "ovest" if pericolo > 4 else "est"',
  'energia = 0\nfor impulso in [3, 3, 3]:\n    energia += impulso\n    print(energia)',
  'oggetti = stiva\nequipaggiamento = oggetti[slot]', 'stato = "ON" + "LINE"',
  'carica = sum(impulsi)\nomega = carica > 9',
];

test('Avventura: 12 missioni con Skulpt, tre indizi, errori, soluzioni e pannelli', async t => {
  const browser = await openBrowser('', { width: 1366, height: 900 });
  t.after(browser.close);
  const evaluate = browser.evaluate;
  await evaluate(`Promise.all([
    import('./js/missions/catalog.mjs'), import('./js/missions/validate.mjs'), import('./js/python/runner.mjs')
  ]).then(([{ missions }, { validateMission }, { createPythonRunner }]) => {
    globalThis.adventure = { missions, verify: (id, code) => validateMission(missions[id - 1], code, createPythonRunner()) };
  })`);
  const folder = new URL('../docs/screenshots/v2.1.0/', import.meta.url);
  await mkdir(folder, { recursive: true });
  for (let index = 0; index < alternatives.length; index++) {
    const id = index + 1;
    await t.test(`Missione ${id}`, async () => {
      const validations = await evaluate(`(async () => {
        const { source, solution, hints } = adventure.missions[${index}];
        const bad = await adventure.verify(${id}, source);
        const official = await adventure.verify(${id}, solution);
        const alternative = await adventure.verify(${id}, ${JSON.stringify(alternatives[index])});
        return { hints: hints.length, outputs: [bad, official, alternative].map(({ok, message}) => [ok, message]) };
      })()`);
      assert.equal(validations.hints, 3);
      assert.deepEqual(validations.outputs.map(([ok]) => ok), [false, true, true], JSON.stringify(validations.outputs));
      await evaluate(`document.querySelector('#teacher-open').click();
        document.querySelector('#teacher-mission').value = "${id}";
        document.querySelector('#teacher-launch').click();
        document.querySelector('#mission-code').value = ${JSON.stringify(alternatives[index])};
        document.querySelector('#mission-run').click();`);
      const seen = await evaluate(`new Promise((resolve, reject) => {
        const deadline = performance.now() + 4000;
        const timer = setInterval(() => {
          const result = document.querySelector('#mission-status').dataset.result;
          if (result === 'success' || result === 'error' || performance.now() > deadline) {
            clearInterval(timer);
            if (result === 'success') resolve(document.querySelector('#mission-panel').dataset.system);
            else reject(Error(document.querySelector('#mission-status').textContent));
          }
        }, 20);
      })`);
      assert.ok(seen);
      await writeFile(new URL(`${String(id).padStart(2,'0')}-${seen}.png`, folder), await browser.screenshot());
      await evaluate("document.querySelector('#mission-done').click()");
    });
  }
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-space:progress:v3')).completed"), alternatives.map((_, index) => index + 1));
  const removed = (await fetch(browser.origin + browser.prefix + 'laboratorio.html')).status;
  assert.equal(removed, 404);
  assert.equal(await evaluate("document.querySelector('a[href*=laboratorio]') === null"), true);
  assert.deepEqual(browser.errors, []);
});
