import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProgress, normalizeProgress, saveKey } from '../js/storage/progress.mjs';
import { createAudio } from '../js/audio/sound.mjs';
import { createGame, State } from '../js/game/engine.mjs';

function memory() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('Salvataggio v3, migrazione, convalida e reset', () => {
  const storage = memory();
  storage.setItem('code-space:missioni:v1', '[3,1,99]');
  storage.setItem('code-space:audio:v1', '{"enabled":true,"volume":0.4}');
  const store = createProgress(storage);
  assert.deepEqual(store.state.completed, [1,3]);
  assert.deepEqual(store.state.audio, { enabled: true, volume: .4 });
  store.update({ skipped: [1,2], drafts: { 2: 'vite = 5', 13: 'no' }, upgrades: [4], best: 25,
    light: true, checkpoint: { mode: 'PLAYING', score: 25, time: 3.4 } });
  const restored = createProgress(storage).state;
  assert.deepEqual(restored.upgrades, [1,3]);
  assert.deepEqual(restored.skipped, [2]);
  assert.deepEqual(restored.drafts, { 2: 'vite = 5' });
  assert.deepEqual(restored.checkpoint, { mode: 'PLAYING', score: 25, time: 3.4 });
  store.reset();
  assert.deepEqual(createProgress(storage).state, { ...normalizeProgress(null), audio: restored.audio, light: true });
  storage.setItem(saveKey, '{broken');
  assert.deepEqual(createProgress(storage).state.completed, []);
  storage.setItem(saveKey, '{"version":7,"completed":[5]}');
  assert.deepEqual(createProgress(storage).state, normalizeProgress(null));
  assert.equal(normalizeProgress({ version: 2, checkpoint: { mode: 'PAUSED', score: -1, time: 0 } }).checkpoint, null);
});

test('Storage indisponibile e preferenze in memoria', () => {
  const storage = { getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } };
  const store = createProgress(storage);
  store.update({ completed: [4], drafts: { 2: 'vite = 5' }, best: 30 });
  assert.deepEqual(store.state.completed, [4]);
  store.reset();
  assert.equal(store.state.best, 0);
});

test('Motore modula la densità, rispetta la demo e riprende il checkpoint', () => {
  const result = mode => {
    let seed = 2917;
    const game = createGame({ random: () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32) });
    game.configure({ difficulty: mode });
    game.restore({ mode: State.PLAYING, time: 2, score: 25 });
    assert.equal(game.world.score, 25);
    assert.equal(game.world.time, 2);
    const seen = new Set();
    for (let i = 0; i < 200; i++) { game.step(.05); game.world.rocks.forEach(rock => seen.add(rock)); }
    return { game, count: seen.size };
  };
  const calm = result('calm');
  const { game: intense, count } = result('hard');
  assert.ok(count > calm.count);
  intense.configure({ demo: true, duration: 10 });
  intense.action('final');
  assert.equal(intense.world.finalLeft, 10);
  const reloaded = createGame();
  reloaded.restore({ mode: State.FINAL_CHALLENGE, score: 25, time: 30, duration: 12 });
  assert.equal(reloaded.world.finalLeft, 12);
  for (let i = 0; i < 201; i++) intense.step(.05);
  assert.equal(intense.world.rocks.length, 0);
  assert.equal(intense.world.state, State.VICTORY);
});

test('Audio parte muto, si sblocca su richiesta e gestisce errori', async () => {
  let sessions = 0;
  let notes = 0;
  const node = () => ({
    gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 0 }, connect: target => target, disconnect() {},
    start() { notes++; }, stop() { this.onended(); },
  });
  class FakeAudio {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    constructor() { sessions++; }
    createGain = node;
    createOscillator = node;
    async resume() { this.state = 'running'; }
  }
  const audio = createAudio({ Context: FakeAudio });
  assert.equal(await audio.unlock(), false);
  assert.equal(sessions, 0);
  audio.play('star');
  assert.equal(notes, 0);
  audio.configure(false, .3);
  assert.equal(await audio.unlock(), true);
  for (const effect of ['star', 'impact', 'shield', 'mission', 'success', 'victory']) audio.play(effect);
  assert.equal(notes, 16);
  audio.configure(true, .3);
  audio.play('star');
  assert.equal(notes, 16);
  const broken = createAudio({ Context: class { constructor() { throw Error('audio'); } } });
  broken.configure(false, .25);
  assert.equal(await broken.unlock(), false);
});
