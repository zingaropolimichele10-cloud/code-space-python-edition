import { failure, limits } from './protocol.mjs';

let nextRequestId = 0;

export function createPythonRunner({
  createWorker = () => new Worker(new URL('../../workers/python.worker.js', import.meta.url)),
  timeout = limits.workerMs,
} = {}) {
  let active;

  return function run(source) {
    const id = ++nextRequestId;
    active?.finish(failure('CANCELLED'));
    if (typeof source !== 'string' || source.length > limits.source) {
      return Promise.resolve({ id, ...failure('SOURCE_LIMIT') });
    }

    return new Promise(resolve => {
      let worker;
      try {
        worker = createWorker();
      } catch {
        resolve({ id, ...failure('WORKER_ERROR') });
        return;
      }

      function finish(result) {
        if (active?.id !== id) return;
        clearTimeout(timer);
        active = undefined;
        worker.terminate();
        resolve({ ...result, id });
      }

      const timer = setTimeout(() => finish(failure('WORKER_TIMEOUT')), timeout);
      active = { id, finish };
      worker.onmessage = ({ data }) => {
        if (data?.id === id) finish(data);
      };
      worker.onerror = event => {
        event.preventDefault();
        finish(failure('WORKER_ERROR'));
      };
      worker.onmessageerror = () => finish(failure('WORKER_ERROR'));
      try {
        worker.postMessage({ id, source });
      } catch {
        finish(failure('WORKER_ERROR'));
      }
    });
  };
}
