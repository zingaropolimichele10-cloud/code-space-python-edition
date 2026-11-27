import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

test('Quattro missioni con Skulpt locale: soluzione, alternativa, errore, vuoto, sintassi e timeout', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  await browser.evaluate(`Promise.all([
    import('./js/missions/catalog.mjs'), import('./js/missions/validate.mjs'), import('./js/python/runner.mjs'),
    import('./js/missions/editor-tools.mjs')
  ]).then(([catalog, validation, py, editor]) => {
    const run = py.createPythonRunner();
    globalThis.prova = (id, source) => {
      const mission = catalog.missions.find(item => item.id === id);
      return validation.validateMission(mission, source ?? mission.soluzioneEsempio, run);
    };
    globalThis.protectsLines = editor.protectsLines;
  })`);
  const alternatives = ['velocita = 5 * 2', 'print("Aurora " + "online")', 'scudo = 2 < 3', 'colore = "ver" + "de"'];
  const wrong = ['velocita = 5', 'print("offline")', 'scudo = False', 'colore = "arancione"'];
  const execute = (id, source) => browser.evaluate(`prova(${id}${source === undefined ? '' : ', ' + JSON.stringify(source)})`);
  for (let id = 1; id <= 4; id++) {
    await t.test(`Missione ${id}`, async () => {
      assert.equal((await execute(id)).ok, true);
      assert.equal((await execute(id, alternatives[id - 1])).ok, true);
      assert.equal((await execute(id, wrong[id - 1])).ok, false);
      assert.match((await execute(id, '')).message, /Riga 1/);
      assert.match((await execute(id, 'x =')).message, /sintassi/i);
      assert.match((await execute(id, 'while True:\n    pass')).message, /tempo scaduto/i);
      assert.equal((await execute(id)).ok, true);
    });
  }
  assert.equal((await execute(4, 'colore = "viola"')).ok, true);
  assert.match((await execute(1, 'if True\n    velocita = 10')).message, /due punti.*Riga 1/s);
  assert.match((await execute(1, 'if True:\nvelocita = 10')).message, /quattro spazi/);
  assert.match((await execute(1, 'velocita = manca')).message, /nome.*Riga 1/i);
  assert.match((await execute(1, 'x = "test" + 7')).message, /numero.*testo con str/);
  assert.match((await execute(1, 'velocita = 1 // 0')).message, /divisore.*zero/);
  assert.deepEqual(await browser.evaluate(`(() => {
    const mission = { codiceIniziale: 'x = 1\\nprint(x)', righeModificabili: [2] };
    return ['x = 1\\nprint(x + 1)', 'x = 2\\nprint(x)', 'print(x)', 'x = 1\\nprint(x)\\nprint(x)']
      .map(source => protectsLines(mission, source));
  })()`), [true, false, false, false]);
  assert.deepEqual(browser.errors, []);
});
