import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, State } from '../js/game/engine.mjs';
import { missionPolicy } from '../js/missions/policy.mjs';
import { sessionService } from '../js/classroom/session.mjs';
import { createProgress, saveKey } from '../js/storage/progress.mjs';

function flight(nextMission = () => 1) {
  const game = createGame({ nextMission, random: () => .2 });
  game.configure({ asteroids: false });
  game.action('start');
  return game;
}
const pythonStar = game => game.world.stars.find(star => star.mission != null);
function fly(game, seconds) {
  for (let frame = 0; frame < Math.round(seconds * 20); frame++) game.step(.05);
}

test('45 secondi effettivi; pausa ed editor esclusi; la stella resta ferma per 20 secondi', () => {
  const game = flight();
  fly(game, 44.95);
  assert.equal(pythonStar(game), undefined);
  game.action('pause');
  fly(game, 100);
  assert.equal(pythonStar(game), undefined);
  game.action('resume');
  fly(game, .05);
  const star = pythonStar(game);
  assert.ok(star);
  const x = star.x;
  fly(game, 19.9);
  assert.equal(star.x, x);
  fly(game, .2);
  assert.ok(Math.abs(star.x - x) < 2 && star.x !== x);
  assert.equal(game.requestMissionStar(), false);
  game.openMission(1);
  game.requestMissionStar();
  fly(game, 90);
  assert.equal(pythonStar(game), undefined);
  game.closeMission();
  fly(game, 19.95);
  assert.equal(pythonStar(game), undefined);
  fly(game, .05);
  assert.ok(pythonStar(game));
});

test('Frequenza live, manuale con automatismo sospeso e volo libero al limite', () => {
  let next = 1;
  const game = flight(() => next);
  fly(game, 22);
  game.configure({ missionInterval: 25, missionAuto: false, missionLimit: 1 });
  fly(game, 20);
  assert.equal(pythonStar(game), undefined);
  game.requestMissionStar();
  game.requestMissionStar();
  fly(game, .05);
  assert.equal(game.world.stars.filter(star => star.mission != null).length, 1);
  game.openMission(1);
  game.closeMission();
  next = 2;
  game.configure({ missionAuto: true, missionInterval: 20 });
  fly(game, 25);
  assert.equal(pythonStar(game), undefined);
  assert.equal(game.world.state, State.PLAYING);
  game.configure({ missionLimit: 2 });
  fly(game, .05);
  assert.equal(pythonStar(game).mission, 2);
  assert.equal(game.action('final'), true);
  assert.equal(game.world.state, State.FINAL_CHALLENGE);
  assert.deepEqual(missionPolicy({ missionInterval: 21, missionLimit: 23 }), {
    missionLimit: 10, missionInterval: 45, missionAuto: true,
  });
});

test('Aggiornamenti Host transazionali: 10 → 13 → 17 → 21 → 22, segnale e riconnessione', async () => {
  let room = { phase: 'flight', seq: 0, settings: {}, pin: '123456' };
  const store = { get: async () => structuredClone(room), transaction: async (_, fn) => Boolean(room = fn(room)) };
  const service = sessionService(store);
  for (const [increment, limit] of [[3, 13], [4, 17], [4, 21], [4, 22]]) {
    await service.missionOptions('room', 'add', increment);
    assert.equal(missionPolicy((await store.get()).settings).missionLimit, limit);
  }
  await service.missionOptions('room', 'interval', 95);
  await service.missionOptions('room', 'toggle');
  await service.missionOptions('room', 'spawn');
  const fresh = await store.get();
  assert.equal(fresh.pin, '123456');
  assert.equal(fresh.settings.missionSignal, fresh.seq);
  assert.deepEqual(missionPolicy(fresh.settings), { missionLimit: 22, missionInterval: 95, missionAuto: false });
});

test('Preferenze in solitaria persistono e il vecchio salvataggio è ancora leggibile', () => {
  const data = new Map([[saveKey, JSON.stringify({ version: 3, completed: [1], best: 51 })]]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const progress = createProgress(storage);
  assert.deepEqual(progress.state.completed, [1]);
  progress.update({ completed: [1], best: 51, missionOptions: { missionLimit: 17, missionInterval: 35, missionAuto: false } });
  const restored = createProgress(storage).state;
  assert.deepEqual(restored.completed, [1]);
  assert.equal(restored.best, 51);
  assert.deepEqual(restored.missionOptions, { missionLimit: 17, missionInterval: 35, missionAuto: false });
});
