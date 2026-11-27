import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';
import { missions } from '../js/missions/catalog.mjs';
import { protectsLines } from '../js/missions/editor-tools.mjs';

test('Missioni 18–22: valore e ordine delle liste, debug, funzioni e soglia Omega con Skulpt', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  const { evaluate } = browser;
  await evaluate(`Promise.all([
    import('./js/missions/catalog.mjs'), import('./js/missions/validate.mjs'), import('./js/python/runner.mjs')
  ]).then(([catalog, validation, py]) => {
    const run = py.createPythonRunner();
    globalThis.verify = (id, source) => validation.validateMission(catalog.missions[id - 1], source, run);
  })`);
  const examples = [
    [18, 'inventario.append("ki" + "t")', 'inventario.append("cavo")', [2]],
    [19, 'if ("carbu" + "rante") in inventario:', 'if "cavo" in inventario:', [4]],
    [20, 'if sistema_pronto == True:\n    print(messaggio)', 'if True:\n    print(messaggio)', [2, 3]],
    [21, 'scudo = (attiva_scudo())', 'scudo = True', [4]],
    [22, '        carica += impulso', '        carica = carica + 1', [4]],
  ];
  const run = (id, source) => evaluate(`verify(${id}, ${JSON.stringify(source)})`);
  for (const [id, alternative, wrong, rows] of examples) {
    await t.test(`Missione ${id}`, async () => {
      const lesson = missions[id - 1];
      const withEdit = text => {
        const lines = lesson.codiceIniziale.split('\n');
        lines.splice(rows[0] - 1, rows.length, text);
        return lines.join('\n');
      };
      assert.ok(protectsLines(lesson, withEdit(alternative)));
      assert.equal((await run(id, lesson.soluzioneEsempio)).ok, true);
      assert.equal((await run(id, withEdit(alternative))).ok, true);
      assert.equal((await run(id, withEdit(wrong))).ok, false);
      assert.match((await run(id, '')).message, /Scrivi il codice/);
      assert.match((await run(id, 'x =')).message, /sintassi/i);
      assert.match((await run(id, 'while True:\n    continue')).message, /Tempo scaduto/);
      assert.equal((await run(id, lesson.soluzioneEsempio)).ok, true);
      assert.equal(lesson.indizi.length, 3);
    });
  }
  const solve = id => run(id, missions[id - 1].soluzioneEsempio);
  assert.deepEqual((await solve(18)).variables.inventario.value, ['cavo', 'filtro', 'kit']);
  assert.deepEqual((await solve(19)).cases.map(item => item.output), ['cavo\ncarburante\n', 'kit\n', '', 'cavo\n']);
  assert.match((await run(20, missions[19].codiceIniziale)).message, /due punti.*Riga 2/);
  assert.match((await run(20, 'messaggio = "Sistemi pronti"\nif sistema_pronto:\nprint(messagio)')).message, /spazi.*Riga 3/);
  assert.match((await run(20, 'messaggio = "Sistemi pronti"\nif sistema_pronto:\n    print(messagio)')).message, /nome.*Riga 3/i);
  assert.deepEqual((await solve(21)).cases.map(item => item.variables.scudo.value), [true, false]);
  assert.deepEqual((await solve(22)).cases.map(({ variables }) => [variables.totale.value, variables.omega.value]),
    [[9, false], [10, true], [12, true], [0, false]]);
  assert.deepEqual(browser.errors, []);
});
