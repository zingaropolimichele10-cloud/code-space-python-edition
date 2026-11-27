import { answerQuiz } from './quiz-fixture.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';
import { missions } from '../js/missions/catalog.mjs';

const edits = [
  'velocita = 5 * 2', 'print("Aurora " + "online")', 'scudo = 5 > 4', 'colore = "b" + "lu"',
  'energia += 20', 'scafo = -danni + 100', 'danno = livello * (5 + 5)', 'per_motore = int(energia_totale / motori)',
  'messaggio = "Ciao {}".format(nome)', 'print("Vite:", vite)', '    scudo = vite < 3',
  ['    rotta = "de" + "via"', '    rotta = "cont" + "inua"'],
  ['    allarme = "rosso"', '    allarme = "gia" + "llo"', '    allarme = "verde"'],
  'if energia >= 21 and vite <= 2:', 'for i in range(1, 4):', '    totale += i', '    contatore -= 1',
  'inventario.append("ki" + "t")', 'if ("carbu" + "rante") in inventario:',
  ['if sistema_pronto == True:', '    print(messaggio)'], 'scudo = (attiva_scudo())', '        carica += impulso',
];
const alternatives = edits.map((code, index) => {
  const mission = missions[index];
  const lines = mission.source.split('\n');
  mission.righeModificabili.forEach((row, n) => { lines[row - 1] = [].concat(code)[n]; });
  return lines.join('\n');
});

test('Avventura: 22 missioni con Skulpt, tre indizi, errori, soluzioni e pannelli', async t => {
  const browser = await openBrowser('', { width: 1366, height: 900 });
  t.after(browser.close);
  const evaluate = browser.evaluate;
  await evaluate(`Promise.all([
    import('./js/missions/catalog.mjs'), import('./js/missions/validate-adventure.mjs'), import('./js/python/runner.mjs')
  ]).then(([{ missions }, { validateMission }, { createPythonRunner }]) => {
    globalThis.adventure = { missions, verify: (id, code) => validateMission(missions[id - 1], code, createPythonRunner()) };
  })`);
  const folder = process.env.CODESPACE_ADVENTURE_SHOTS;
  if (folder) await mkdir(folder, { recursive: true });
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
        document.querySelector('#teacher-unlock').click();
        document.querySelector('#teacher-mission').value = "${id}";
        document.querySelector('#teacher-launch').click();
        document.querySelector('#mission-code').value = ${JSON.stringify(alternatives[index])};`);
      await answerQuiz(evaluate);
      await evaluate(`
        document.querySelector('#mission-run').click();`);
      const seen = await evaluate(`new Promise((resolve, reject) => {
        const deadline = performance.now() + 4000;
        const timer = setInterval(() => {
          const result = document.querySelector('#mission-status').dataset.result;
          if (result === 'success' || result === 'error' || performance.now() > deadline) {
            clearInterval(timer);
            if (result === 'success') resolve(document.querySelector('#control-center').dataset.mission);
            else reject(Error(document.querySelector('#mission-status').textContent));
          }
        }, 20);
      })`);
      assert.ok(seen);
      if (folder) await writeFile(`${folder}/${id}.png`, await browser.screenshot());
      await evaluate("document.querySelector('#mission-done').click()");
    });
  }
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-space:progress:v3')).completed"), alternatives.map((_, index) => index + 1));
  const removed = (await fetch(browser.origin + browser.prefix + 'laboratorio.html')).status;
  assert.equal(removed, 404);
  assert.equal(await evaluate("document.querySelector('a[href*=laboratorio]') === null"), true);
  assert.deepEqual(browser.errors, []);
});
