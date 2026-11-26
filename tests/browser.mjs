import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname } from 'node:path';
import { once } from 'node:events';

const prefix = '/code-space-python-edition/';
const root = new URL('../', import.meta.url);
const mime = {
  '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript',
  '.js': 'text/javascript', '.svg': 'image/svg+xml',
};

export async function openBrowser(path = '', { beforeLoad, width = 1360, height = 900, staticRoot = root, listenHost = '127.0.0.1', clientHost = listenHost, externalOrigin, externalPrefix = prefix, extraArgs = [], pages = {} } = {}) {
  const profile = await mkdtemp(`${tmpdir()}/codespace-browser-`);
  const requests = [];
  let serving = true;
  const server = createServer(async (req, res) => {
    requests.push(req.url);
    if (!serving) return res.writeHead(503).end();
    if (req.url === '/release-test-probe') {
      res.setHeader('Content-Type', 'text/html');
      return res.end('<!doctype html><title>Verifica aggiornamento</title>');
    }
    if (Object.hasOwn(pages, req.url)) {
      res.setHeader('Content-Type', 'text/html');
      return res.end(pages[req.url]);
    }
    try {
      if (!req.url.startsWith(prefix)) throw new Error('Percorso fuori dal sottosito');
      const target = new URL(req.url.slice(prefix.length) || 'index.html', staticRoot);
      if (!target.href.startsWith(staticRoot.href)) throw new Error('Percorso non valido');
      res.setHeader('Content-Type', mime[extname(target.pathname)] ?? 'application/octet-stream');
      res.end(await readFile(target));
    } catch {
      res.writeHead(404).end();
    }
  });
  server.listen(0, listenHost);
  await once(server, 'listening');
  const origin = externalOrigin ?? `http://${clientHost}:${server.address().port}`;
  const sitePath = externalOrigin ? externalPrefix : prefix;
  const args = [
    '--headless', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking',
    '--no-first-run', '--no-default-browser-check', '--no-proxy-server', `--user-data-dir=${profile}`,
    ...extraArgs, '--remote-debugging-pipe', 'about:blank',
  ];
  if (process.env.CODESPACE_NO_SANDBOX === '1') args.unshift('--no-sandbox');
  const browser = spawn(process.env.CHROMIUM_BIN || 'chromium', args, {
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
    env: { ...process.env, XDG_CACHE_HOME: profile, XDG_CONFIG_HOME: profile },
  });
  let stderr = '';
  browser.stderr.setEncoding('utf8').on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
  const pending = new Map();
  const network = [];
  const errors = [];
  let messageId = 0;
  let buffer = '';
  const [input, output] = browser.stdio.slice(3);

  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Comando Chromium scaduto: ${method}\n${stderr}`));
      }, 8000);
      pending.set(id, message => {
        clearTimeout(timer);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      });
      input.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
    });
  }

  input.on('error', () => {});
  function failPending(error) {
    for (const complete of pending.values()) complete({ error });
    pending.clear();
  }
  browser.on('error', failPending);
  browser.on('exit', (code, signal) => {
    failPending(new Error(`Chromium terminato (${code ?? signal})\n${stderr}`));
  });
  output?.setEncoding('utf8').on('data', chunk => {
    buffer += chunk;
    let boundary = buffer.indexOf('\0');
    while (boundary !== -1) {
      const message = JSON.parse(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 1);
      boundary = buffer.indexOf('\0');
      if (message.id) {
        pending.get(message.id)?.(message);
        pending.delete(message.id);
      } else if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
      } else if (message.method === 'Network.requestWillBeSent') {
        network.push(message.params.request.url);
      } else if (message.method === 'Target.attachedToTarget') {
        const { sessionId, targetInfo } = message.params;
        if (targetInfo.type === 'worker') {
          void Promise.all([send('Network.enable', {}, sessionId), send('Runtime.enable', {}, sessionId)])
            .then(() => send('Runtime.runIfWaitingForDebugger', {}, sessionId))
            .catch(() => {});
        }
      }
    }
  });

  async function close() {
    if (browser.exitCode === null && browser.signalCode === null && browser.pid) {
      const exited = once(browser, 'exit');
      browser.kill('SIGKILL');
      await exited;
    }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(profile, { recursive: true, force: true, maxRetries: 4 });
  }

  try {
    const version = await send('Browser.getVersion');
    const { targetInfos } = await send('Target.getTargets');
    const targetId = targetInfos.find(target => target.type === 'page')?.targetId ?? (await send('Target.createTarget', { url: 'about:blank' })).targetId;
    const { sessionId } = await send('Target.attachToTarget', {
      targetId, flatten: true,
    });
    const page = (method, params) => send(method, params, sessionId);
    await page('Network.enable');
    await page('Page.enable');
    await page('Runtime.enable');
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    if (beforeLoad) await page('Page.addScriptToEvaluateOnNewDocument', { source: beforeLoad });
    await page('Target.setAutoAttach', {
      autoAttach: true, waitForDebuggerOnStart: true, flatten: true,
      filter: [{ type: 'worker' }, { exclude: true }],
    });
    await page('Page.navigate', { url: origin + sitePath + path });
    async function evaluate(expression) {
      const response = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
      }
      return response.result.value;
    }
    async function screenshot() {
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      return Buffer.from(data, 'base64');
    }
    return {
      evaluate, page, screenshot, close, requests, network, errors, origin, prefix: sitePath, send, targetId,
      setServing(value) { serving = value; },
      version: version.product,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
