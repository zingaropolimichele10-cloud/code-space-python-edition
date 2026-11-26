import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, HEIGHT, LIMITS, State, WIDTH } from '../js/game/engine.mjs';

function started(options) {
  const game = createGame(options);
  assert.equal(game.action('tutorial'), true);
  assert.equal(game.action('start'), true);
  return game;
}
const asteroid = ship => ({ x: ship.x, y: ship.y, radius: 18, vx: 0, vy: 0, angle: 0, spin: 0 });
const tick = (game, count) => {
  for (let index = 0; index < count; index++) game.step(1 / 60);
};

test('Quattro direzioni, diagonale normalizzata e passo indipendente dalla frequenza', () => {
  for (const [key, x, y] of [
    ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1],
  ]) {
    const game = started();
    const before = { ...game.world.ship };
    game.keys.add(key);
    game.step(0.05);
    assert.equal(game.world.ship.x, before.x + 9.5 * x);
    assert.equal(game.world.ship.y, before.y + 9.5 * y);
  }
  const diagonal = started();
  diagonal.keys.add('ArrowLeft').add('ArrowUp');
  const before = { ...diagonal.world.ship };
  diagonal.step(0.2);
  assert.ok(Math.abs(Math.hypot(before.x - diagonal.world.ship.x, before.y - diagonal.world.ship.y) - 9.5) < 1e-9);
  const split = started();
  split.keys.add('ArrowLeft').add('ArrowUp');
  split.step(0.025);
  split.step(0.025);
  assert.ok(Math.abs(split.world.ship.x - diagonal.world.ship.x) < 1e-9);
});

test('Bordi del campo, collisione, invulnerabilità e checkpoint', () => {
  const upper = started({ random: () => 0.5 });
  upper.keys.add('ArrowLeft').add('ArrowUp');
  tick(upper, 300);
  assert.deepEqual([upper.world.ship.x, upper.world.ship.y], [20, 20]);
  const lower = started({ random: () => 0 });
  lower.keys.add('ArrowRight').add('ArrowDown');
  tick(lower, 500);
  assert.deepEqual([lower.world.ship.x, lower.world.ship.y], [WIDTH - 20, HEIGHT - 20]);

  const game = started({ random: () => 0 });
  const { world } = game;
  world.ship.invulnerable = 0;
  world.rocks.push(asteroid(world.ship), asteroid(world.ship));
  game.step(0.01);
  assert.equal(world.lives, 2);
  game.step(0.01);
  assert.equal(world.lives, 2);
  tick(game, 80);
  assert.equal(world.lives, 1);
  world.ship.invulnerable = 0;
  world.rocks.push(asteroid(world.ship));
  game.step(0.01);
  assert.equal(world.state, State.GAME_OVER);
  assert.equal(world.lives, 0);
  assert.equal(game.action('checkpoint'), true);
  assert.equal(world.state, State.PLAYING);
  assert.equal(world.lives, 3);
  assert.equal(world.rocks.length, 0);
});

test('Stelle, apertura esclusiva e congelamento della simulazione', () => {
  const game = started({ nextMission: () => 1 });
  const { world } = game;
  world.stars.push({ ...world.ship, vy: 0 }, { ...world.ship, vy: 0, mission: 1 });
  game.step(0.01);
  assert.equal(world.score, 25);
  assert.equal(world.state, State.MISSION);
  assert.equal(game.openMission(2), false);
  const frozen = structuredClone(world);
  tick(game, 200);
  assert.deepEqual(world, frozen);
  assert.equal(game.closeMission(), true);
  game.step(0.01);
  assert.equal(world.score, 35);
  game.action('pause');
  const paused = world.time;
  tick(game, 200);
  assert.equal(world.time, paused);
  game.action('resume');
  game.step(0.01);
  assert.ok(world.time > paused);
});

test('Scudi a consumo, ricarica e sfida finale con vittoria', () => {
  const game = started({ random: () => 0 });
  const { world } = game;
  game.grant({ shield: true }, 3);
  game.grant({ autoShield: true }, 5);
  world.ship.invulnerable = 0;
  world.lives = 2;
  for (const [lives, shield, emergency] of [[2, false, true], [2, false, false], [1, false, false]]) {
    world.ship.invulnerable = 0;
    world.rocks.push(asteroid(world.ship));
    game.step(0.01);
    assert.deepEqual([world.lives, world.shield, world.emergency], [lives, shield, emergency]);
  }
  tick(game, 1100);
  assert.equal(world.shield, true);
  assert.equal(game.action('final'), true);
  game.action('pause');
  game.action('resume');
  assert.equal(world.state, State.FINAL_CHALLENGE);
  tick(game, 1321);
  assert.equal(world.state, State.VICTORY);
  assert.equal(game.action('menu'), true);
  game.action('tutorial');
  game.action('start');
  assert.equal(world.upgrades.shield, true);
  assert.equal(world.lives, 3);
});

test('Simulazione prolungata con limiti e recuperi', t => {
  let seed = 2917;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const game = started({ random, nextMission: () => 1 });
  const max = { rocks: 0, stars: 0, particles: 0 };
  let recoveries = 0;
  const start = performance.now();
  for (let frame = 0; frame < 108000; frame++) {
    if (game.world.state === State.GAME_OVER) {
      game.action('checkpoint');
      recoveries++;
    }
    if (game.world.state === State.MISSION) game.closeMission();
    if (frame % 23 === 0) {
      game.keys.clear();
      game.keys.add(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][Math.floor(random() * 4)]);
    }
    game.step(1 / 60);
    for (const key of Object.keys(max)) max[key] = Math.max(max[key], game.world[key].length);
  }
  const ms = performance.now() - start;
  for (const key of Object.keys(max)) {
    assert.ok(max[key] > 0 && max[key] <= LIMITS[key]);
  }
  assert.ok(recoveries > 0);
  t.diagnostic(`108000 passi, 1800 s simulati, ${ms.toFixed(1)} ms CPU a parete, picchi ${JSON.stringify(max)}, ${recoveries} recuperi`);
});
