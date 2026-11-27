import { answerQuiz } from './quiz-fixture.mjs';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const profileRoot = new URL('../', import.meta.url);
async function waitFor(browser, expression) {
  const end = Date.now() + 9000;
  do {
    try { if (await browser.evaluate(expression)) return; } catch { /* Durante la navigazione. */ }
    await new Promise(resolve => setTimeout(resolve, 40));
  } while (Date.now() < end);
  assert.fail(expression);
}

test('Recupero individuale dopo refresh in volo, missione e boss, poi riavvio reale di Chromium', async t => {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, profileRoot);
    const basename = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const mime = basename.endsWith('.mjs') || basename.endsWith('.js') ? 'application/javascript'
      : basename.endsWith('.css') ? 'text/css' : basename.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
    try { res.setHeader('Content-Type', mime); res.end(await readFile(new URL(basename, profileRoot))); }
    catch { res.writeHead(404).end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const profilePath = await mkdtemp(tmpdir() + '/codespace-restore-profile-');
  t.after(() => rm(profilePath, { recursive: true, force: true }));
  const externalOrigin = `http://127.0.0.1:${server.address().port}`;
  const opts = { profilePath, externalOrigin, externalPrefix: '/' };
  let browser = await openBrowser('', opts);
  let open = true;
  t.after(async () => { if (open) await browser.close(); });
  const state = value => `document.querySelector('#viewport')?.dataset.state === '${value}'`;
  const click = selector => browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await waitFor(browser, "document.body.classList.contains('at-launch') && document.readyState === 'complete'");
  await click('#menu-panel [data-action=tutorial]');
  await click('#tutorial-panel [data-action=start]');
  await waitFor(browser, state('PLAYING'));
  await browser.page('Page.reload');
  await waitFor(browser, state('PAUSED'));
  await click('#paused-panel [data-action=resume]');
  assert.equal(await browser.evaluate(state('PLAYING')), true);
  await click('#pause-button');
  await click('[data-open-teacher]');
  await click('#teacher-launch');
  await browser.evaluate(`
    const editor = document.querySelector('#mission-code');
    editor.value = 'velocita = 9 # bozza';
    editor.dispatchEvent(new Event('input'));
  `);
  await browser.page('Page.reload');
  await waitFor(browser, state('MISSION'));
  assert.equal(await browser.evaluate("document.getElementById('mission-code').value"), 'velocita = 9 # bozza');
  await click('#mission-skip');
  await click('#final-button');
  await waitFor(browser, state('FINAL_CHALLENGE'));
  await browser.page('Page.reload');
  await waitFor(browser, state('PAUSED'));
  await click('#paused-panel [data-action=resume]');
  assert.equal(await browser.evaluate(state('FINAL_CHALLENGE')), true);
  await click('#pause-button');
  await waitFor(browser, '!!navigator.serviceWorker.controller');
  await browser.page('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await browser.page('Page.reload');
  await waitFor(browser, state('PAUSED'));
  await browser.page('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await browser.close();
  open = false;
  browser = await openBrowser('', opts);
  open = true;
  await waitFor(browser, state('PAUSED'));
  assert.equal(await browser.evaluate("JSON.parse(localStorage.getItem('code-space:progress:v3')).drafts[1]"), 'velocita = 9 # bozza');
  await click('#paused-panel [data-action=resume]');
  assert.equal(await browser.evaluate(state('FINAL_CHALLENGE')), true);
  await browser.close();
  open = false;
});

test('Host Classroom archivia tre lezioni indipendenti, recupera l’ultima e importa senza scritture online', async t => {
  const browser = await openBrowser('classroom.html?demo=1&role=host', { beforeLoad: 'window.confirm = () => true;' });
  t.after(browser.close);
  const click = id => browser.evaluate(`document.getElementById('${id}').click()`);
  await waitFor(browser, "document.body.dataset.role === 'host'");
  await click('host-login');
  await waitFor(browser, "!document.getElementById('create-form').hidden");
  const pins = [];
  for (let group = 1; group <= 3; group++) {
    await browser.evaluate(`document.getElementById('host-group').value = '${group}'; document.getElementById('create-form').requestSubmit();`);
    await waitFor(browser, `document.getElementById('room-title').textContent === 'Gruppo ${group}'`);
    pins.push(await browser.evaluate("document.getElementById('pin-value').textContent"));
    assert.match(pins.at(-1), /^\d{6}$/);
    assert.equal(await browser.evaluate("document.querySelector('#rank-body').rows.length"), 0);
    if (group === 3) {
      await browser.page('Page.reload');
      await waitFor(browser, `document.getElementById('pin-value').textContent === '${pins.at(-1)}'`);
    }
    await browser.evaluate("document.querySelector('[data-command=end]').click()");
    await waitFor(browser, "document.getElementById('phase-label').textContent === 'Sessione terminata'");
    await waitFor(browser, `[...document.getElementById('host-history').options].some(item => item.textContent.includes('Gruppo ${group}') && item.textContent.includes('archiviata'))`);
    await click('new-room');
    await waitFor(browser, "!document.getElementById('entry').hidden");
  }
  assert.equal(new Set(pins).size, 3);
  await browser.evaluate(`(() => {
    const key = Object.keys(localStorage).find(key => key.includes(':archive:'));
    const data = JSON.parse(localStorage.getItem(key));
    const forged = {...data[0], title: 'Importazione alterata', results: [{name:'Alterato',rank:1,points:99999}]};
    const transfer = new DataTransfer();
    transfer.items.add(new File([JSON.stringify({schema:1,kind:'code-space-classroom',sessions:[forged]})], 'backup.json', {type:'application/json'}));
    const input = document.getElementById('host-import');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
  })()`);
  await waitFor(browser, "document.getElementById('archive-status').textContent.includes('sola lettura')");
  assert.equal(await browser.evaluate("document.getElementById('host-history').textContent.includes('Importazione alterata')"), false);
  await browser.evaluate(`document.getElementById('host-history').selectedIndex = 1`);
  await click('host-restore');
  await waitFor(browser, "!document.getElementById('room-panel').hidden");
  assert.equal(await browser.evaluate("document.querySelector('#rank-body').textContent.includes('Alterato')"), false);
});

test('Disconnessione Classroom simulata: il terminale conserva la bozza e attende l’Host', async t => {
  const browser = await openBrowser('__test-connection.html', { pages: {
    '/code-space-python-edition/__test-connection.html':
      '<!doctype html><iframe id="client" src="./index.html?classroom=1" width="1000" height="700"></iframe>',
  }, beforeLoad: `addEventListener('message', event => {
    if (event.data?.type === 'cs:ready') window.clientReady = true;
    if (event.data?.type === 'cs:save') window.clientSave = event.data.recovery;
  });` });
  t.after(browser.close);
  const iframe = "document.getElementById('client')";
  const state = value => `${iframe}.contentDocument?.querySelector('#viewport')?.dataset.state === '${value}'`;
  const policy = (seq, state) => browser.evaluate(`${iframe}.contentWindow.postMessage(${JSON.stringify({
    type: 'cs:policy', room: 'connection-test', seq, state, completed: 0, arcade: 0,
    settings: { difficulty: 'calm', rocks: false, audio: false, bossSeconds: 60, skip: true },
  })}, location.origin)`);
  await waitFor(browser, 'window.clientReady === true');
  await policy(1, 'flight');
  await waitFor(browser, state('PLAYING'));
  await policy(2, 'offline');
  await waitFor(browser, state('PAUSED'));
  assert.equal(await browser.evaluate(`${iframe}.contentDocument.querySelector('[data-action=resume]').disabled`), true);
  await policy(3, 'flight');
  await waitFor(browser, state('PLAYING'));
  await browser.evaluate(`(() => {
    const w = ${iframe}.contentWindow;
    const nativeRAF = w.requestAnimationFrame.bind(w);
    let now = w.performance.now();
    w.Math.random = () => .5;
    let callbacks = [];
    const pump = actual => {
      now = Math.max(now, actual);
      for (let i = 0; i < 5; i++) {
        const batch = callbacks;
        callbacks = [];
        now += 50;
        for (const callback of batch) callback(now);
      }
      nativeRAF(pump);
    };
    w.requestAnimationFrame = callback => callbacks.push(callback);
    nativeRAF(pump);
  })()`);
  const heartbeat = await browser.evaluate(`setInterval(() => ${iframe}.contentWindow.postMessage({
    type: 'cs:heartbeat', room: 'connection-test', seq: 3
  }, location.origin), 200)`);
  await waitFor(browser, state('MISSION'));
  await answerQuiz(browser.evaluate, `${iframe}.contentDocument`);
  await browser.evaluate(`(() => {
    const w = ${iframe}.contentWindow;
    const editor = w.document.getElementById('mission-code');
    editor.value = 'velocita = 8 # rete';
    editor.dispatchEvent(new w.Event('input'));
  })()`);
  await waitFor(browser, "window.clientSave?.drafts?.[1] === 'velocita = 8 # rete'");
  await browser.evaluate(`clearInterval(${heartbeat})`);
  await policy(4, 'offline');
  const run = `${iframe}.contentDocument.getElementById('mission-run')`;
  await waitFor(browser, `${run}.disabled`);
  await policy(5, 'flight');
  await waitFor(browser, `!${run}.disabled`);
  assert.equal(await browser.evaluate(`${iframe}.contentDocument.getElementById('mission-code').value`), 'velocita = 8 # rete');
  assert.deepEqual(browser.errors, []);
});
