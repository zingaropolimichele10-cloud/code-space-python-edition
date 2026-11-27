import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

test('Catalogo ufficiale: le 22 soluzioni e gli scenari girano nel Worker Skulpt', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  // Una pagina neutra evita il ricaricamento di index al primo controllerchange.
  await browser.page('Page.navigate', { url: browser.origin + '/release-test-probe' });
  for (let id = 1; id <= 22; id++) {
    await t.test(`Missione ${id}`, async () => {
      const result = await browser.evaluate(`Promise.all([
        import(${JSON.stringify(browser.prefix + 'js/missions/catalog.mjs')}),
        import(${JSON.stringify(browser.prefix + 'js/missions/validate-adventure.mjs')}),
        import(${JSON.stringify(browser.prefix + 'js/python/runner.mjs')}),
      ]).then(async ([{ missions }, { validateMission }, { createPythonRunner }]) => {
        const mission = missions[${id - 1}];
        const result = await validateMission(mission, mission.soluzioneEsempio, createPythonRunner());
        return { ...result, scenarioCount: mission.scenariDiTest.length };
      })`);
      assert.equal(result.ok, true, result.message);
      assert.equal(result.cases.length, result.scenarioCount);
    });
  }
  assert.deepEqual(browser.errors, []);
});

test('La missione scafo mostra una sola consegna, dato di bordo, teoria e riga modificabile', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  assert.equal(await browser.evaluate(`(async () => {
    if (document.readyState !== 'complete') await new Promise(resolve => addEventListener('load', resolve, { once: true }));
    document.querySelector('#teacher-open').click();
    document.querySelector('#teacher-mission').value = '6';
    document.querySelector('#teacher-launch').click();
    return document.querySelector('#control-center').open;
  })()`), true);
  const { evaluate } = browser;
  assert.match(await evaluate("document.querySelector('#mission-goal').textContent"), /danni fornito dal computer/);
  assert.match(await evaluate("document.querySelector('#mission-explanation').textContent"), /100 − 35 = 65/);
  assert.match(await evaluate("document.querySelector('#mission-panel').textContent"), /danni = 35/);
  assert.equal(await evaluate("document.querySelector('.mission-editable-line').textContent.trim()"), '1');
  assert.equal(await evaluate("document.querySelector('#mission-edit')"), null);
  assert.equal(await evaluate("document.querySelector('#mission-code').readOnly"), true);
  assert.deepEqual(browser.errors, []);
});
