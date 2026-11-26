import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

test('Prototipo Python in Chromium', async t => {
  const fixture = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'">
  <title>CODE SPACE – Python Edition</title>
  <link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
  <script type="module" src="./js/python/editor.mjs"></script>
</head>
<body>
  <p id="offline-notice" class="offline-notice" role="status" hidden></p>
  <main>
    <header>
      <h1>CODE SPACE <span>Python Edition</span></h1>
      <p>Laboratorio Python</p>
    </header>
    <div class="laboratorio">
      <form>
        <label for="codice">Codice Python</label>
        <textarea id="codice" rows="12" spellcheck="false" autocapitalize="off" autocomplete="off">velocita = 5 * 2
print(velocita)</textarea>
        <button type="submit">Esegui</button>
      </form>
      <section aria-label="Risultati">
        <p id="stato" role="status">Pronto per eseguire.</p>
        <h2>Output</h2>
        <pre id="output" tabindex="0"></pre>
        <h2>Variabili</h2>
        <pre id="variabili" tabindex="0"></pre>
      </section>
    </div>
  </main>
</body>
</html>
`;
  const browser = await openBrowser('__python-test.html', { pages: {
    '/code-space-python-edition/__python-test.html': fixture,
  } });

  t.after(browser.close);
  t.diagnostic(browser.version);
  const { evaluate } = browser;
  await evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else addEventListener('load', resolve, { once: true });
  })`);
  await evaluate(`import('./js/python/runner.mjs').then(({ createPythonRunner }) => {
    globalThis.runCode = createPythonRunner();
  })`);
  const execute = source => evaluate(`runCode(${JSON.stringify(source)})`);
  const successful = async (source, name, type, value) => {
    const result = await execute(source);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.variables[name], { type, value });
    return result;
  };
  const fails = async (source, code) => {
    const result = await execute(source);
    assert.equal(result.ok, false, JSON.stringify(result));
    assert.equal(result.error.code, code, JSON.stringify(result));
    assert.ok(result.error.message.length > 0);
    return result;
  };
  const condition = vite => `vite = ${vite}\nscudo = False\nif vite < 3:\n    scudo = True`;

  await t.test('01 Assegnazione intera', () => successful('velocita = 10', 'velocita', 'int', 10));
  await t.test('02 Espressione equivalente', () => successful('velocita = 5 * 2', 'velocita', 'int', 10));
  await t.test('03 Vite', () => successful('vite = 5', 'vite', 'int', 5));
  await t.test('04 Booleano', () => successful('scudo = True', 'scudo', 'bool', true));
  await t.test('05 Stringa', () => successful('colore = "blu"', 'colore', 'str', 'blu'));
  await t.test('06 Condizione con poche vite', () => successful(condition(2), 'scudo', 'bool', true));
  await t.test('07 Condizione con molte vite e soglia', async () => {
    await successful(condition(5), 'scudo', 'bool', false);
    await successful(condition(3), 'scudo', 'bool', false);
  });
  await t.test('08 Errore di sintassi', () => fails('velocita =', 'SYNTAX'));
  await t.test('09 Nome non definito', async () => {
    const result = await fails('vite = 5\nprint(manca)', 'NAME');
    assert.equal(result.error.line, 2);
  });
  await t.test('10 Errore di rientro', async () => {
    await fails('if True:\nprint("ciao")', 'INDENTATION');
    await fails('  vite = 5', 'INDENTATION');
    await fails('if True:\n    vite = 5\n  vite = 2', 'INDENTATION');
  });
  await t.test('11 Ciclo infinito', () => fails('while True:\n    pass', 'INTERPRETER_TIMEOUT'));
  await t.test('12 Ripresa subito dopo il ciclo', () => successful('vite = 5', 'vite', 'int', 5));
  await t.test('13 Esecuzioni consecutive e Python 3', async () => {
    const first = await successful('velocita = 10', 'velocita', 'int', 10);
    const second = await successful('valore = 5 / 2\nprint(valore)', 'valore', 'float', 2.5);
    assert.notEqual(first.id, second.id);
    assert.equal(second.output, '2.5\n');
    assert.equal(second.variables.velocita, undefined);
    await fails('print 1', 'SYNTAX');
  });
  await t.test('14 Codice oltre il limite', () => fails('#'.repeat(8193), 'SOURCE_LIMIT'));
  await t.test('15 Output oltre il limite', async () => {
    const result = await fails('print("x" * 4097)', 'OUTPUT_LIMIT');
    assert.equal(result.output.length, 4096);
  });
  await t.test('16 Importazioni vietate', async () => {
    await fails('import math', 'IMPORT');
    await fails('from urllib import request', 'IMPORT');
    await fails('__import__("js")', 'IMPORT');
    await fails('print(1)\nimport sys', 'IMPORT');
    await fails('print(1)\n__import__("sys")', 'IMPORT');
    await fails('jseval("1")', 'NAME');
    await fails('open("file")', 'NAME');
  });
  await t.test('17 Tipi errati e intero fuori intervallo', async () => {
    for (const source of ['velocita = True', 'vite = 5.0', 'scudo = 1', 'colore = ["blu"]']) {
      await fails(source, 'VARIABLE_TYPE');
    }
    await fails('class int:\n    pass\nvelocita = int()', 'VARIABLE_TYPE');
    await fails('velocita = 10 ** 30', 'VARIABLE_LIMIT');
  });
  await t.test('18 Interfaccia reattiva durante il blocco', async () => {
    const result = await evaluate(`(async () => {
      const status = document.querySelector('#stato');
      const editor = document.querySelector('#codice');
      editor.value = 'while True:\\n    pass';
      document.querySelector('button').click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      editor.focus();
      await new Promise(resolve => setTimeout(resolve, 50));
      const responsive = document.activeElement === editor && status.textContent === 'Esecuzione in corso…';
      while (status.textContent === 'Esecuzione in corso…') {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      return { responsive, status: status.textContent };
    })()`);
    assert.equal(result.responsive, true);
    assert.match(result.status, /tempo di esecuzione/);
  });
  await t.test('19 Avvio sotto il sottopercorso e rendering dei risultati', async () => {
    const result = await evaluate(`(async () => {
      const editor = document.querySelector('#codice');
      const status = document.querySelector('#stato');
      editor.value = 'velocita = 5 * 2\\nprint(velocita)';
      document.querySelector('button').click();
      while (status.textContent === 'Esecuzione in corso…') {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      return [location.pathname, document.querySelector('#output').textContent,
        document.querySelector('#variabili').textContent];
    })()`);
    assert.deepEqual(result, [browser.prefix + '__python-test.html', '10\n', 'velocita = 10 (intero)']);
    assert.ok(browser.requests.includes(browser.prefix + 'workers/python.worker.js'));
    assert.ok(browser.requests.includes(browser.prefix + 'vendor/skulpt/skulpt.min.js'));
  });
  await t.test('Timeout esterno e ripresa con Worker reale', async () => {
    const outcome = await evaluate(`(async () => {
      const { createPythonRunner } = await import('./js/python/runner.mjs');
      const url = new URL('./workers/python.worker.js', location.href);
      let created = 0;
      let terminated = 0;
      let received = 0;
      const run = createPythonRunner({
        timeout: 1500,
        createWorker() {
          const worker = new Worker(url);
          const suppressResponse = ++created === 1;
          const endpoint = {
            postMessage(data) { worker.postMessage(data); },
            terminate() { terminated++; worker.terminate(); },
          };
          worker.onmessage = event => {
            received++;
            if (!suppressResponse) endpoint.onmessage(event);
          };
          worker.onerror = event => endpoint.onerror(event);
          return endpoint;
        },
      });
      const first = await run('while True:\\n    pass');
      const second = await run('vite = 5');
      return { first, second, created, terminated, received };
    })()`);
    assert.equal(outcome.first.error.code, 'WORKER_TIMEOUT');
    assert.deepEqual(outcome.second.variables.vite, { type: 'int', value: 5 });
    assert.deepEqual([outcome.created, outcome.terminated, outcome.received], [2, 2, 2]);
  });
  await t.test('20 Traffico runtime confinato al sottosito', () => {
    assert.ok(browser.network.some(url => url.endsWith('/vendor/skulpt/skulpt.min.js')),
      JSON.stringify(browser.network));
    assert.ok(browser.network.every(url => url.startsWith(browser.origin + browser.prefix)),
      JSON.stringify(browser.network));
    assert.ok(browser.requests.every(path => path.startsWith(browser.prefix)));
  });
});
