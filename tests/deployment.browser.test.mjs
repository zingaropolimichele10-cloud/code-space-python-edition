import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openBrowser } from './browser.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(join(project, 'release-manifest.json')));
const zipName = 'code-space-python-edition-' + version;

async function unpack(t) {
  const dir = await mkdtemp(join(tmpdir(), 'codespace-release-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const archive = join(dir, 'release.zip');
  execFileSync('python3', ['tools/build-offline.py', archive], { cwd: project });
  execFileSync('python3', ['-m', 'zipfile', '-e', archive, dir]);
  return join(dir, zipName);
}

async function waitFor(browser, expression) {
  return browser.evaluate(`new Promise((resolve, reject) => {
    const start = performance.now();
    const id = setInterval(async () => {
      try {
        if (await (${expression})) { clearInterval(id); resolve(true); }
        else if (performance.now() - start > 6500) { clearInterval(id); reject(Error('Condizione assente')); }
      } catch (error) { clearInterval(id); reject(error); }
    }, 35);
  })`);
}

async function verifyPython(browser) {
  await waitFor(browser, "document.readyState === 'complete' && !!document.getElementById('teacher-open')");
  await browser.evaluate(`(() => {
    document.getElementById('teacher-open').click();
    document.getElementById('teacher-launch').click();
    const editor = document.getElementById('mission-code');
    editor.value = 'velocita = 5 * 2';
    editor.dispatchEvent(new Event('input'));
    document.getElementById('mission-run').click();
  })()`);
  await waitFor(browser, "['success','error'].includes(document.getElementById('mission-status').dataset.result)");
  assert.equal(await browser.evaluate("document.getElementById('mission-status').dataset.result"), 'success');
  assert.equal(await browser.evaluate("document.getElementById('speed').textContent"), '10');
}

test('Cache offline dopo il primo avvio: ricarica, laboratorio e vero Worker senza server', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  await waitFor(browser, '!!navigator.serviceWorker.controller');
  const cached = await browser.evaluate(`caches.open('code-space:/code-space-python-edition/:${version}').then(c => c.keys()).then(k => k.length)`);
  const { runtime } = JSON.parse(await readFile(join(project, 'release-manifest.json')));
  assert.equal(cached, runtime.length);
  await browser.page('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  browser.setServing(false);
  const onlineRequests = browser.requests.length;
  await browser.page('Page.reload');
  await verifyPython(browser);
  await browser.evaluate(`(() => {
    document.getElementById('mission-done').click();
    document.getElementById('teacher-open').click();
    document.getElementById('teacher-mission').value = '11';
    document.getElementById('teacher-launch').click();
    const editor = document.getElementById('mission-code');
    editor.value = editor.value.replace(/False$/, 'True');
    editor.dispatchEvent(new Event('input'));
    document.getElementById('mission-run').click();
  })()`);
  await waitFor(browser, "['success','error'].includes(document.getElementById('mission-status').dataset.result)");
  assert.equal(await browser.evaluate("document.getElementById('mission-status').dataset.result"), 'success');
  assert.match(await browser.evaluate("document.getElementById('mission-instruments').textContent"), /2 vite · Accesa.*3 vite · Spenta/);
  await browser.evaluate(`(() => {
    document.getElementById('mission-done').click();
    document.getElementById('teacher-open').click();
    document.getElementById('teacher-mission').value = '16';
    document.getElementById('teacher-launch').click();
    const editor = document.getElementById('mission-code');
    editor.value = editor.value.replace('totale + 0', 'totale + i');
    editor.dispatchEvent(new Event('input'));
    document.getElementById('mission-run').click();
  })()`);
  await waitFor(browser, "['success','error'].includes(document.getElementById('mission-status').dataset.result)");
  assert.equal(await browser.evaluate("document.getElementById('mission-status').dataset.result"), 'success');
  assert.match(await browser.evaluate("document.getElementById('mission-instruments').textContent"), /Giro 1 · 1 unità.*Giro 5 · 15 unità/);
  await browser.page('Page.navigate', { url: browser.origin + browser.prefix + 'laboratorio.html' });
  await waitFor(browser, "document.readyState === 'complete' && !!document.getElementById('codice')");
  await browser.evaluate("document.querySelector('button[type=submit]').click()");
  await waitFor(browser, "document.getElementById('output').textContent.trim() === '10'");
  assert.equal(browser.requests.length, onlineRequests);
  assert.deepEqual(browser.errors, []);
});

test('Aggiornamento atomico: cache in attesa, messaggio e rimozione della versione precedente', async t => {
  const directory = await unpack(t);
  const browser = await openBrowser('', { staticRoot: pathToFileURL(directory + '/') });
  t.after(browser.close);
  await waitFor(browser, '!!navigator.serviceWorker.controller');
  const worker = join(directory, 'sw.js');
  const manifest = join(directory, 'release-manifest.json');
  await writeFile(worker, (await readFile(worker, 'utf8')).replace(version, version + '.next'));
  await writeFile(manifest, (await readFile(manifest, 'utf8')).replace(version, version + '.next'));
  await browser.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update()).then(() => true)');
  await waitFor(browser, "!document.getElementById('offline-notice').hidden");
  const old = 'code-space:/code-space-python-edition/:' + version;
  const next = old + '.next';
  assert.deepEqual((await browser.evaluate('caches.keys()')).sort(), [old, next]);
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Target.closeTarget', { targetId: browser.targetId });
  const page = (method, params) => browser.send(method, params, sessionId);
  await page('Page.navigate', { url: browser.origin + '/release-test-probe' });
  const replacement = {
    async evaluate(expression) {
      const response = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description);
      return response.result.value;
    },
  };
  await waitFor(replacement, `globalThis.caches?.keys().then(names => names.length === 1 && names[0] === ${JSON.stringify(next)})`);
  await page('Page.navigate', { url: browser.origin + browser.prefix });
  await waitFor(replacement, '!!navigator.serviceWorker?.controller');
  assert.deepEqual(browser.errors, []);
});

test('ZIP estratto avviato dal server Python su loopback e sull’indirizzo LAN del container', async t => {
  const directory = await unpack(t);
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '0.0.0.0', '--directory', directory]);
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const closed = once(server, 'exit');
      server.kill();
      await closed;
    }
  });
  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.on('exit', () => reject(Error('Avvio del server Python non riuscito')));
    server.stdout.setEncoding('utf8').on('data', line => {
      const match = line.match(/port (\d+)/);
      if (match) resolve(Number(match[1]));
    });
  });
  const outsideLoopback = Object.values(networkInterfaces()).flat()
    .find(item => item?.family === 'IPv4' && !item.internal)?.address;
  for (const host of ['127.0.0.1', outsideLoopback].filter(Boolean)) {
    const externalOrigin = `http://${host}:${port}`;
    const browser = await openBrowser('', { externalOrigin, externalPrefix: '/' });
    try {
      await verifyPython(browser);
      assert.ok(browser.network.some(url => url.endsWith('/workers/python.worker.js')));
      assert.ok(browser.network.every(url => url.startsWith(externalOrigin + '/')));
      assert.deepEqual(browser.errors, []);
      t.diagnostic(host === '127.0.0.1' ? 'ZIP su loopback, server Python' : 'ZIP su IPv4 non-loopback, stesso container');
    } finally { await browser.close(); }
  }
  if (!outsideLoopback) t.diagnostic('Nessun indirizzo IPv4 non-loopback disponibile');
});
