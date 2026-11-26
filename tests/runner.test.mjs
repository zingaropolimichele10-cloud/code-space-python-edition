import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPythonRunner } from '../js/python/runner.mjs';

function setup(timeout = 1000) {
  const workers = [];
  const run = createPythonRunner({
    timeout,
    createWorker() {
      const worker = {
        postMessage(message) { this.request = message; },
        terminate() { this.terminated = true; },
        reply(id = this.request.id) { this.onmessage({ data: { id, ok: true } }); },
      };
      workers.push(worker);
      return worker;
    },
  });
  return { run, workers };
}

test('Il timer esterno termina il worker e il prossimo invio parte da zero', async () => {
  const { run, workers } = setup(20);
  assert.equal((await run('while True: pass')).error.code, 'WORKER_TIMEOUT');
  assert.equal(workers[0].terminated, true);
  const next = run('vite = 5');
  workers[1].reply();
  assert.equal((await next).ok, true);
});

test('La richiesta più recente prevale anche se arrivano risposte obsolete', async () => {
  const { run, workers } = setup();
  const first = run('vite = 3');
  const second = run('vite = 5');
  assert.equal((await first).error.code, 'CANCELLED');
  assert.equal(workers[0].terminated, true);
  assert.notEqual(workers[0].request.id, workers[1].request.id);
  workers[0].reply();
  workers[1].reply(workers[0].request.id);
  workers[1].reply();
  assert.equal((await second).id, workers[1].request.id);
});

test('Chiudere una missione annulla il Worker anche senza un nuovo invio', async () => {
  const { run, workers } = setup();
  const attempt = run('vite = 5');
  run.cancel();
  assert.equal((await attempt).error.code, 'CANCELLED');
  assert.equal(workers[0].terminated, true);
  workers[0].reply();
  const next = run('vite = 3');
  workers[1].reply();
  assert.equal((await next).ok, true);
});
