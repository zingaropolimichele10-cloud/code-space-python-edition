import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '../tests/browser.mjs';

const seconds = Number(process.env.CODESPACE_SOAK_SECONDS ?? 2400);
if (!Number.isFinite(seconds) || seconds < 1) throw Error('Durata non valida');
const folder = process.env.CODESPACE_SOAK_SHOTS;
const browser = await openBrowser('', {
  beforeLoad: `(() => {
    const WorkerClass = Worker;
    window.probe = { frames: [], active: 0, peak: 0, workers: 0, occurrences: {}, move: 0 };
    window.Worker = class extends WorkerClass {
      constructor(...args) {
        super(...args);
        probe.workers++;
        probe.peak = Math.max(probe.peak, ++probe.active);
      }
      terminate() {
        if (!this.finished) { this.finished = true; probe.active--; }
        super.terminate();
      }
    };
    Math.random = () => .5;
    let previous;
    function sample(now) {
      if (previous !== undefined && document.getElementById('viewport')?.dataset.state === 'PLAYING') {
        probe.frames.push(now - previous);
      }
      previous = now;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  })()`,
});

try {
  await browser.evaluate(`new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else addEventListener('load', resolve, { once: true });
  })`);
  const picture = async name => {
    if (!folder) return;
    await mkdir(folder, { recursive: true });
    await writeFile(folder + '/' + name + '.png', await browser.screenshot());
  };
  await picture('01-menu');
  await browser.evaluate(`(() => {
    const q = selector => document.querySelector(selector);
    const click = selector => q(selector)?.click();
    window.autofly = () => {
      const world = q('#viewport').dataset.state;
      probe.occurrences[world] = (probe.occurrences[world] ?? 0) + 1;
      if (world === 'MENU') click('[data-action=tutorial]');
      else if (world === 'TUTORIAL') click('#tutorial-panel [data-action=start]');
      else if (world === 'PAUSED') click('[data-action=resume]');
      else if (world === 'GAME_OVER') { click('[data-action=checkpoint]'); probe.checkpoints = (probe.checkpoints ?? 0) + 1; }
      else if (world === 'VICTORY') { click('#victory-panel [data-action=start]'); probe.restarts = (probe.restarts ?? 0) + 1; }
      else if (world === 'PLAYING') {
        if (probe.move % 145 === 100) {
          click('#teacher-open');
          const demo = q('#teacher-demo');
          demo.checked = true;
          demo.dispatchEvent(new Event('change'));
          const duration = q('#teacher-duration');
          duration.value = 10;
          duration.dispatchEvent(new Event('change'));
          click('#teacher-final');
        } else if (probe.move % 145 === 118 && q('#teacher-demo').checked) {
          click('#teacher-open');
          const demo = q('#teacher-demo');
          demo.checked = false;
          demo.dispatchEvent(new Event('change'));
          q('#teacher').close();
        } else if (probe.move % 57 === 30) click('#pause-button');
        else if (!probe.workers || probe.move % 18 === 0) {
          if (!q('#mission-retry').hidden) click('#mission-retry');
        }
        if (probe.move % 29 < 2) {
          const key = probe.move % 29 === 0 ? 'ArrowLeft' : 'ArrowRight';
          dispatchEvent(new KeyboardEvent('keydown', { key }));
          setTimeout(() => dispatchEvent(new KeyboardEvent('keyup', { key })), 75);
        }
        probe.move++;
      } else if (world === 'MISSION') {
        const status = q('#mission-status').dataset.result;
        if (status === 'pending') return;
        if (status === 'success') { click('#mission-done'); return; }
        if (status === 'error' && probe.workers % 2 === 1) { click('#mission-skip'); return; }
        const editor = q('#mission-code');
        const starters = ['velocita = 5 * 2', 'vite = 5', 'scudo = True', 'colore = "blu"',
          'scudo = False\\nif vite < 3:\\n    scudo = True'];
        const id = Number(q('#mission-id').textContent.match(/\\d+/)?.[0] ?? 1);
        editor.value = probe.workers % 2 === 0 ? 'print(manca)' : starters[id - 1];
        if (probe.move % 4 === 0 && probe.workers % 2 === 1) editor.value = starters[id - 1];
        click('#mission-run');
      }
    };
  })()`);
  const from = performance.now();
  const frames = [];
  let last;
  const images = new Set();
  const heaps = [];
  do {
    last = await browser.evaluate(`(() => {
      const q = selector => document.querySelector(selector);
      const result = { ...probe, frames: probe.frames.splice(0), state: q('#viewport').dataset.state,
        missionResult: q('#mission-status').dataset.result };
      autofly();
      return result;
    })()`);
    frames.push(...last.frames);
    if (folder) {
      const label = last.state === 'MISSION' ? 'missione-' + (last.missionResult || 'aperta') : last.state.toLowerCase();
      if (!images.has(label)) { images.add(label); await picture(label); }
    }
    const elapsed = (performance.now() - from) / 1000;
    if (heaps.length <= Math.floor(elapsed / 60)) {
      heaps.push((await browser.page('Runtime.getHeapUsage')).usedSize);
      console.log(JSON.stringify({ elapsed: Math.round(elapsed), state: last.state, frames: frames.length,
        worker: last.active, created: last.workers, heap: heaps.at(-1), errors: browser.errors.length }));
    }
    if (elapsed < seconds) await delay(950);
  } while ((performance.now() - from) / 1000 < seconds);
  const elapsed = (performance.now() - from) / 1000;
  frames.sort((a, b) => a - b);
  const percentile = percent => frames[Math.min(frames.length - 1, Math.floor(frames.length * percent))];
  const result = { realSeconds: elapsed, sampleFrames: frames.length,
    fps: 1000 * frames.length / frames.reduce((sum, frame) => sum + frame, 0),
    p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), heaps,
    states: last.occurrences, peakWorkers: last.peak, workers: last.workers, activeWorkers: last.active,
    checkpoints: last.checkpoints, restarts: last.restarts, errors: browser.errors };
  console.log(JSON.stringify(result));
  assert.deepEqual(browser.errors, []);
  assert.ok(browser.network.every(url => url.startsWith(browser.origin + browser.prefix)));
} finally { await browser.close(); }
