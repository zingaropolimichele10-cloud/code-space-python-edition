import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { performance } from 'node:perf_hooks';
import { MISSION_MASK, missions } from '../js/missions/catalog.mjs';
import { command, defaults, gate, ranking, score } from '../js/classroom/model.mjs';
import { createGame, LIMITS, State } from '../js/game/engine.mjs';
import { normalizeProgress } from '../js/storage/progress.mjs';

test('Progressi 2.0: la difesa passa a Scudo intelligente senza attribuire Messaggio di bordo', () => {
  const migrated = normalizeProgress({ version: 2, completed: [1, 2, 3, 4, 5], skipped: [],
    drafts: { 1: 'velocita = 6', 2: 'vite = 3', 4: 'colore = "rosso"', 5: 'scudo = vite < 3' },
    best: 95, light: true, checkpoint: { mode: 'PLAYING', score: 5, time: 7 } });
  assert.deepEqual(migrated.completed, [1, 3, 4, 11]);
  assert.deepEqual(migrated.drafts, { 1: 'velocita = 6', 11: 'scudo = vite < 3' });
  assert.equal(migrated.best, 95);
  assert.equal(migrated.light, true);
  assert.equal(migrated.checkpoint.time, 7);
  assert.deepEqual(normalizeProgress({ ...migrated, skipped: [6, 22, 23] }).skipped, [6, 22]);
  assert.deepEqual(normalizeProgress({ version: 2, drafts: { 5: 99 } }).drafts, {});
});

test('Classifiche 2.0 e 2.1 distinte, missione 22 e prevalenza didattica', () => {
  assert.equal(MISSION_MASK, 4194303);
  assert.equal(score({ mask: 31, arcade: 1000, boss: true }), 6000);
  assert.equal(score({ mask: MISSION_MASK, arcade: 1000, boss: true }, true), 27200);
  assert.equal(ranking({ omega: { name: 'Omega' }, arc: { name: 'Arcade' } }, {
    omega: { mask: 1 << 21 }, arc: { mask: 0, arcade: 1000 },
  }, true)[0].uid, 'omega');
});

test('Regole: limiti distinti per versione, maschera monotona, metriche private', async () => {
  const { rules } = JSON.parse(await readFile(new URL('../database.rules.json', import.meta.url)));
  const control = rules.rooms.$room;
  assert.match(control.settings['.validate'], /newData.child\('adventure'\).val\(\) === data.child\('adventure'\).val\(\)/);
  assert.match(control.settings.required['.validate'], /<= 5.*adventure.*<= 22/);
  assert.match(control['.write'], /pins.*adventure.*settings\/adventure/);
  const mask = rules.scores.$room.$uid.mask['.validate'];
  assert.match(mask, /<= 31.*adventure.*<= 4194303/);
  for (const bit of Array.from({ length: 22 }, (_, n) => 2 ** n)) {
    assert.ok(mask.includes(`data.val() % ${bit * 2} < ${bit} || newData.val() % ${bit * 2} >= ${bit}`));
  }
  const { $uid, '.read': metricRead } = rules.metrics.$room;
  assert.match($uid.mission['.validate'], /adventure.*<= 22/);
  assert.match(metricRead, /owner.*hosts/);
  assert.doesNotMatch(metricRead, /viewAccess/);
  assert.equal(rules.scores.$room.$uid.errors, undefined);
  assert.match(rules.members.$room.$uid['.validate'], /adventure.*settings\/adventure/);
});

test('I potenziamenti cambiano il volo e Omega danneggia davvero il drone', () => {
  const game = createGame();
  game.action('start');
  for (const mission of missions) game.grant(mission.upgrade, mission.id);
  assert.equal(game.world.upgrades.speed, 10);
  assert.equal(game.world.lives, 5);
  assert.equal(game.world.shield, true);
  assert.equal(game.world.score, 0);
  assert.equal(game.world.emergency, true);
  assert.ok(['laser', 'reactor', 'navigator', 'rapid', 'magnet', 'autopilot', 'omega'].every(key => game.world.upgrades[key]));
  game.action('final');
  game.keys.add('Space');
  game.step(.05);
  const shot = game.world.shots[0];
  assert.equal(shot.omega, true);
  assert.equal(shot.power, 2);
  const { boss } = game.world;
  const before = boss.hp;
  game.world.shots.push({ ...shot, x: boss.x, y: boss.y + 12 });
  game.step(.05);
  assert.equal(boss.hp, before - 5);
});

test('Lezione simulata di 40 minuti: aula, pausa, ripresa, boss e riepilogo', t => {
  const minute = 60000;
  const start = performance.now();
  let control = { phase: 'lobby', seq: 0, until: 0, at: 0, expires: 3 * 60 * minute,
    settings: { ...defaults, adventure: true } };
  let seed = 2917;
  const game = createGame({ random: () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32) });
  const players = { a: { name: 'Aurora' }, b: { name: 'Vega' } };
  const scores = { a: { mask: 0 }, b: { mask: 0 } };
  let refreshes = 0;
  let ticks = 0;
  let missionIndex = 0;
  const peaks = { shots: 0, rocks: 0, stars: 0, particles: 0 };
  for (let now = 0; now <= 40 * minute; now += 50) {
    if (now === 11 * minute) control = command(control, 'start', now);
    if (now === 16 * minute) control = command(control, 'pause', now);
    if (now === 17 * minute) control = command(control, 'resume', now);
    if (now === 28 * minute) control = command(control, 'boss', now);
    if (now === 33 * minute) control = command(control, 'end', now);
    const phase = gate(control, true, now);
    if (phase === 'flight' && game.world.state === State.MENU) game.action('start');
    if (phase === 'boss' && game.world.state === State.PLAYING) game.action('final');
    if (phase === 'flight' && now >= 12 * minute && missionIndex < missions.length && now % (minute / 2) === 0) {
      const mission = missions[missionIndex++];
      // Una postazione salta le bonus e arriva comunque al boss.
      scores.a.mask |= 1 << (mission.id - 1);
      if (!mission.optional) scores.b.mask |= 1 << (mission.id - 1);
      game.grant(mission.upgrade, mission.id);
    }
    if (phase === 'flight' || phase === 'boss') {
      if (game.world.state === State.GAME_OVER) { game.action('recover'); refreshes++; }
      game.keys.add('Space');
      game.step(.05);
      ticks++;
      for (const key of Object.keys(peaks)) peaks[key] = Math.max(peaks[key], game.world[key].length);
    }
  }
  assert.equal(gate(control, true, 40 * minute), 'ended');
  assert.equal(ranking(players, scores, true)[0].mask, MISSION_MASK);
  assert.equal(scores.b.mask, 31);
  for (const key of Object.keys(peaks)) assert.ok(peaks[key] <= LIMITS[key]);
  assert.ok(ticks > 15000);
  t.diagnostic(`40 minuti virtuali, ${ticks} chiamate al motore, ${refreshes} recuperi, picchi ${JSON.stringify(peaks)}, ${(performance.now() - start).toFixed(1)} ms elapsed`);
});
