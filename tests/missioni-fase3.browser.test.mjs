import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

test('Missioni 12–17: soglie, rami e sequenze eseguiti da Skulpt', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  const { evaluate } = browser;
  await evaluate(`Promise.all([
    import('./js/missions/catalog.mjs'), import('./js/missions/validate.mjs'),
    import('./js/python/runner.mjs'), import('./js/missions/editor-tools.mjs')
  ]).then(([catalog, validation, py, editor]) => {
    const run = py.createPythonRunner();
    globalThis.lessons = catalog.missions;
    globalThis.prova = (id, source) => {
      const mission = lessons.find(item => item.id === id);
      return validation.validateMission(mission, source ?? mission.soluzioneEsempio, run);
    };
    globalThis.editable = (id, source) => editor.protectsLines(lessons[id - 1], source);
  })`);
  const examples = [
    [12, 'if distanza < 50:\n    rotta = "de" + "via"\nelse:\n    rotta = "continua"', 'rotta = "devia"'],
    [13, 'if energia < 20:\n    allarme = "rosso"\nelif energia < 50:\n    allarme = "gia" + "llo"\nelse:\n    allarme = "verde"', 'allarme = "verde"'],
    [14, 'scudo = False\nif energia >= 21 and vite <= 2:\n    scudo = True', 'scudo = vite < 3 or energia > 20'],
    [15, 'for i in range(1, 4):\n    print("Impulso")', 'for i in range(2):\n    print("Impulso")'],
    [16, 'totale = 0\nfor i in range(1, 6):\n    totale += i\n    print(totale)', 'totale = 0\nfor i in range(1, 6):\n    totale = 15\n    print(totale)'],
    [17, 'while contatore > 0:\n    print(contatore)\n    contatore -= 1', 'while contatore > 0:\n    print(contatore)\n    contatore -= 2'],
  ];
  const execute = (id, source) => evaluate(`prova(${id}${source === undefined ? '' : ', ' + JSON.stringify(source)})`);
  assert.deepEqual(await evaluate('lessons.map(({ id }) => id)'), Array.from({ length: 17 }, (_, index) => index + 1));
  for (const [id, alternative, wrong] of examples) {
    await t.test(`Missione ${id}`, async () => {
      assert.equal((await execute(id)).ok, true);
      assert.equal(await evaluate(`editable(${id}, ${JSON.stringify(alternative)})`), true);
      assert.equal((await execute(id, alternative)).ok, true);
      assert.equal((await execute(id, wrong)).ok, false);
      assert.match((await execute(id, '')).message, /Scrivi il codice/);
      assert.match((await execute(id, 'x =')).message, /sintassi/i);
      assert.match((await execute(id, 'while True:\n    continue')).message, /Tempo scaduto/);
      assert.equal((await execute(id)).ok, true);
    });
  }
  assert.deepEqual((await execute(12)).cases.map(item => item.variables.rotta.value), ['devia', 'continua', 'continua']);
  assert.deepEqual((await execute(13)).cases.map(item => item.variables.allarme.value), ['rosso', 'giallo', 'giallo', 'verde', 'verde']);
  assert.deepEqual((await execute(14)).cases.map(item => item.variables.scudo.value), [true, false, false, false]);
  assert.equal((await execute(16)).output, '1\n3\n6\n10\n15\n');
  assert.deepEqual((await execute(17)).cases.map(item => item.output), ['3\n2\n1\n', '2\n1\n', '']);
  assert.match((await execute(17, 'while contatore > 0:\n    print(contatore)\n    contatore -= 0')).message, /ciclo/i);
  assert.deepEqual(browser.errors, []);
});
