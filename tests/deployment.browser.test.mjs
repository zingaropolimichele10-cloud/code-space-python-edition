import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openBrowser } from './browser.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const { version, runtime } = JSON.parse(await readFile(join(project, 'release-manifest.json')));
const cachePrefix = 'code-space:/code-space-python-edition/:';
const baselines = { '1.1.0': '2204764', '2.0.0-firebase.2': '8ac2aaf', '2.1.0': '3ad25f3', '2.1.2': '67dc905' };

async function unpack(t, previous) {
  const dir = await mkdtemp(join(tmpdir(), 'codespace-release-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const archive = join(dir, 'release.zip');
  let source = project;
  if (previous) {
    source = join(dir, 'baseline');
    await mkdir(source);
    const snapshot = join(dir, 'baseline.tar');
    execFileSync('git', ['archive', '--output=' + snapshot, baselines[previous]], { cwd: project });
    execFileSync('tar', ['-xf', snapshot, '-C', source]);
  }
  execFileSync('python3', ['tools/build-offline.py', archive], { cwd: source });
  execFileSync('python3', ['-m', 'zipfile', '-e', archive, dir]);
  return join(dir, 'code-space-python-edition-' + (previous ?? version));
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

test('Cache offline dopo il primo avvio: ricarica e vero Worker senza server', async t => {
  const browser = await openBrowser();
  t.after(browser.close);
  await waitFor(browser, '!!navigator.serviceWorker.controller');
  const cached = await browser.evaluate(`caches.open(${JSON.stringify(cachePrefix + version)}).then(c => c.keys()).then(k => k.length)`);
  assert.equal(cached, runtime.length);
  await browser.page('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  browser.setServing(false);
  const onlineRequests = browser.requests.length;
  await browser.page('Page.reload');
  await verifyPython(browser);
  await browser.page('Page.navigate', { url: browser.origin + browser.prefix + 'classroom.html?demo=1&role=host' });
  await waitFor(browser, "document.readyState === 'complete' && !!document.getElementById('host-login')");
  await browser.evaluate("document.getElementById('host-login').click()");
  await waitFor(browser, "!document.getElementById('create-form').hidden");
  await browser.evaluate("document.getElementById('create-form').requestSubmit()");
  await waitFor(browser, "document.getElementById('join-qr').naturalWidth > 0");
  assert.equal(browser.requests.length, onlineRequests);
  assert.deepEqual(browser.errors, []);
});

async function stageNext(directory) {
  const worker = join(directory, 'sw.js');
  const manifest = join(directory, 'release-manifest.json');
  const fixture = version.replace(/\d+$/, patch => String(Number(patch) + 1));
  await writeFile(worker, (await readFile(worker, 'utf8')).replace(version, fixture));
  await writeFile(manifest, (await readFile(manifest, 'utf8')).replace(version, fixture));
  return fixture;
}

async function verifyUpdate(t, previous) {
  const directory = await unpack(t, previous);
  const browser = await openBrowser('', { staticRoot: pathToFileURL(directory + '/') });
  t.after(browser.close);
  await waitFor(browser, '!!navigator.serviceWorker.controller');
  const data = { version: 2, completed: [1, 3], skipped: [5], best: 123,
    drafts: { 5: 'scudo = False\nif vite < 3:\n    pass' }, light: true,
    audio: { enabled: false, volume: .2 }, checkpoint: { mode: 'PLAYING', time: 25, score: 123 } };
  if (previous) {
    await browser.evaluate(`localStorage.setItem('code-space:progress:v2', ${JSON.stringify(JSON.stringify(data))})`);
    await cp(await unpack(t), directory, { recursive: true });
  } else {
    await stageNext(directory);
  }
  await browser.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update()).then(() => true)');
  await waitFor(browser, "!document.getElementById('offline-notice').hidden");
  const old = cachePrefix + (previous ?? version);
  const next = cachePrefix + (previous ? version : version.replace(/\d+$/, patch => String(Number(patch) + 1)));
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
  if (previous) {
    await waitFor(replacement, "document.getElementById('mission-count')?.textContent === '2 / 5'");
    assert.deepEqual(await replacement.evaluate("JSON.parse(localStorage.getItem('code-space:progress:v2'))"), data);
    await replacement.evaluate("document.getElementById('continue').click(); document.getElementById('mission-retry').click();");
    await waitFor(replacement, "document.getElementById('control-center').open");
    assert.equal(await replacement.evaluate("document.querySelector('#mission-id').textContent.includes('07')"), true);
    assert.equal(await replacement.evaluate("document.getElementById('mission-code').value"),
      'scudo = False\nif vite < 3:\n    scudo = False');
  }
  if (previous === '2.0.0-firebase.2') {
    assert.deepEqual(await replacement.evaluate(`import('./js/classroom/config.mjs').then(({default: c}) => ({
      project: c.projectId, auth: c.authDomain, database: c.databaseURL,
      appMatchesSender: c.appId.startsWith('1:' + c.messagingSenderId + ':web:'),
      hostEmail: c.hostEmail, hostGoogle: c.hostGoogle
    }))`), {
      project: 'code-space-classroom',
      auth: 'code-space-classroom.firebaseapp.com',
      database: 'https://code-space-classroom-default-rtdb.europe-west1.firebasedatabase.app/',
      appMatchesSender: true, hostEmail: true, hostGoogle: false,
    });
  }
  assert.deepEqual(browser.errors, []);
}

test('Aggiornamento atomico: cache in attesa, messaggio e rimozione della versione precedente',
  t => verifyUpdate(t));
test('Aggiornamento reale 1.1.0 con recupero del salvataggio',
  t => verifyUpdate(t, '1.1.0'));
test('Aggiornamento reale da 8ac2aaf: nuova configurazione Firebase nella cache e progressi conservati',
  t => verifyUpdate(t, '2.0.0-firebase.2'));

test('Aggiornamento reale da 2.1.2: nuova cache e avanzamento conservato',
  t => verifyUpdate(t, '2.1.2'));

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

async function afterUpdateNavigation(browser, condition) {
  const end = Date.now() + 8000;
  do {
    try {
      if (await browser.evaluate(condition)) return;
    } catch (error) {
      if (!/target navigated|execution context/i.test(error.message)) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  } while (Date.now() < end);
  assert.fail('Ricarica dell’aggiornamento non osservata');
}

test('Aggiorna ora chiede conferma, conserva bozze e ricarica una volta sola', async t => {
  const directory = await unpack(t);
  const browser = await openBrowser('', {
    staticRoot: pathToFileURL(directory + '/'),
    beforeLoad: `
      sessionStorage.testLoads = Number(sessionStorage.testLoads || 0) + 1;
      window.confirm = () => {
        sessionStorage.testConfirmations = Number(sessionStorage.testConfirmations || 0) + 1;
        return sessionStorage.testAccept === 'yes';
      };
    `,
  });
  t.after(browser.close);
  await waitFor(browser, '!!navigator.serviceWorker.controller');
  const newVersion = await stageNext(directory);
  await browser.evaluate(`navigator.serviceWorker.getRegistration().then(r => r.update())`);
  await waitFor(browser, "!document.querySelector('#offline-notice').hidden");
  await browser.evaluate(`
    document.querySelector('#teacher-open').click();
    document.querySelector('#teacher-launch').click();
    document.querySelector('#offline-notice button').click();
  `);
  assert.equal(await browser.evaluate("sessionStorage.testConfirmations"), '1');
  assert.equal(await browser.evaluate("sessionStorage.testLoads"), '1');
  assert.equal(await browser.evaluate("navigator.serviceWorker.getRegistration().then(r => r.waiting.state)"), 'installed');
  await browser.evaluate(`
    const editor = document.querySelector('#mission-code');
    editor.value = 'velocita = 7';
    editor.dispatchEvent(new Event('input'));
    sessionStorage.testAccept = 'yes';
    setTimeout(() => document.querySelector('#offline-notice button').click(), 0);
  `);
  await afterUpdateNavigation(browser, "sessionStorage.testLoads === '2' && document.readyState === 'complete' && !!navigator.serviceWorker.controller");
  await waitFor(browser, `caches.keys().then(keys => keys.length === 1 && keys[0] === '${cachePrefix}${newVersion}')`);
  assert.equal(await browser.evaluate("JSON.parse(localStorage.getItem('code-space:progress:v3')).drafts[1]"), 'velocita = 7');
  assert.equal(await browser.evaluate("sessionStorage.testConfirmations"), '2');
  await browser.evaluate("navigator.serviceWorker.dispatchEvent(new Event('controllerchange'))");
  assert.equal(await browser.evaluate("sessionStorage.testLoads"), '2');
  assert.deepEqual(browser.errors, []);
});

test('Pagina di recupero attiva l’aggiornamento dalla cache 2.1.0 già bloccata', async t => {
  const directory = await unpack(t, '2.1.0');
  const browser = await openBrowser('', { staticRoot: pathToFileURL(directory + '/') });
  t.after(browser.close);
  await waitFor(browser, '!!navigator.serviceWorker.controller');
  await cp(await unpack(t), directory, { recursive: true });
  await browser.evaluate(`navigator.serviceWorker.getRegistration().then(r => r.update())`);
  await waitFor(browser, "document.querySelector('#offline-notice').textContent.includes('Chiudi tutte le schede')");
  await browser.page('Page.navigate', { url: browser.origin + browser.prefix + 'aggiorna.html' });
  await waitFor(browser, "!document.querySelector('#offline-notice')?.hidden && !!document.querySelector('#offline-notice button')");
  await browser.evaluate("setTimeout(() => document.querySelector('#offline-notice button').click(), 0)");
  await afterUpdateNavigation(browser, "location.pathname.endsWith('/index.html') && !!navigator.serviceWorker.controller");
  assert.deepEqual(await browser.evaluate('caches.keys()'), [cachePrefix + version]);
  assert.deepEqual(browser.errors, []);
});
