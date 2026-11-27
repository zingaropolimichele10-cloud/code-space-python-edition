import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

test('Missioni 5–11 nel Worker Skulpt con dati di bordo variabili', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  const { evaluate } = browser;
  await evaluate(`Promise.all([
    import('./js/missions/catalog.mjs'), import('./js/missions/validate.mjs'), import('./js/python/runner.mjs')
  ]).then(([catalog, validation, py]) => {
    const run = py.createPythonRunner();
    globalThis.missions = catalog.missions;
    globalThis.prova = (id, source) => {
      const mission = missions.find(item => item.id === id);
      return validation.validateMission(mission, source ?? mission.soluzioneEsempio, run);
    };
  })`);
  const attempts = [
    [5, 'energia = 40\nenergia += 20', 'energia = 40\nenergia = 60'],
    [6, 'scafo = -danni + 100', 'scafo = 65'],
    [7, 'danno = livello * (5 + 5)', 'danno = 20'],
    [8, 'per_motore = int(energia_totale / motori)', 'per_motore = 20'],
    [9, 'messaggio = "Ciao {}".format(nome)', 'messaggio = "Ciao Vega"'],
    [10, 'print("Vite:", vite)', 'print("Vite: 3")'],
    [11, 'scudo = False\nif vite < 3:\n    scudo = vite < 3', 'scudo = True'],
  ];
  const execute = (id, source) => evaluate(`prova(${id}${source === undefined ? '' : ', ' + JSON.stringify(source)})`);
  assert.deepEqual(await evaluate('missions.slice(0, 11).map(({ id }) => id)'), Array.from({ length: 11 }, (_, i) => i + 1));
  for (const [id, alternative, wrong] of attempts) {
    await t.test(`Missione ${id}`, async () => {
      const solution = await execute(id);
      assert.equal(solution.ok, true);
      assert.ok(solution.cases.length >= 2);
      assert.equal((await execute(id, alternative)).ok, true);
      assert.match((await execute(id, wrong)).message, /Prova con/);
      assert.match((await execute(id, '')).message, /Scrivi il codice/);
      const prefix = id === 5 ? 'energia = 40\n' : '';
      assert.match((await execute(id, prefix + 'x =')).message, /sintassi/i);
      assert.match((await execute(id, prefix + 'while True:\n    continue')).message, /Tempo scaduto/);
      assert.equal((await execute(id)).ok, true);
      assert.equal(await evaluate(`missions[${id - 1}].indizi.length`), 3);
    });
  }
  assert.match((await execute(8, 'per_motore = energia_totale / motori')).message, /Tipo errato/);
  assert.equal((await execute(10)).output, 'Vite: 3\n');
  assert.deepEqual((await execute(11)).cases.map(item => item.variables.scudo.value), [true, false, false]);
  assert.deepEqual(browser.errors, []);
});
