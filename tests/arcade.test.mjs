import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, LIMITS, State } from '../js/game/engine.mjs';
import { FIRE_KEY, shapeRock } from '../js/game/arcade.mjs';

function flight(options) {
  const game = createGame(options);
  game.action('start');
  return game;
}

function wait(game, seconds) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) game.step(1 / 60);
}

function target(game, type, hp) {
  const { ship } = game.world;
  return { x: ship.x, y: ship.y - 90, radius: 18, vx: 0, vy: 0, angle: 0, spin: 0, type, hp };
}

test('Fuoco a cadenza limitata, impatti multipli, frammenti e punti', () => {
  const keys = [];
  const game = flight({ sound: name => keys.push(name) });
  const { world } = game;
  game.configure({ asteroids: false });
  const armored = target(game, 'armored', 3);
  world.rocks.push(armored);
  game.keys.add(FIRE_KEY);
  wait(game, .18);
  assert.equal(armored.hp, 2);
  assert.equal(world.score, 0);
  wait(game, .8);
  assert.equal(world.stats.rocks, 1);
  assert.equal(world.score, 40);
  assert.ok(keys.filter(name => name === 'fire').length <= 5);
  game.keys.clear();
  world.shots.length = 0;
  const split = target(game, 'split', 1);
  world.rocks.push(split);
  world.shots.push({ x: split.x, y: split.y + 15, radius: 4 });
  game.step(.05);
  assert.equal(world.score, 75);
  assert.equal(world.stats.rocks, 2);
  assert.deepEqual(world.rocks.map(rock => rock.type), ['fragment', 'fragment']);
  assert.ok(world.rocks.length <= LIMITS.rocks);
  assert.ok(world.particles.length <= LIMITS.particles);
  world.rocks.length = 0;
  for (let i = 0; i < LIMITS.shots; i++) world.shots.push({ x: 20, y: 320, radius: 4 });
  game.keys.add(FIRE_KEY);
  game.step(.05);
  assert.equal(world.shots.length, LIMITS.shots);
});

test('Combo, moltiplicatore, bonus di volo e statistiche al checkpoint', () => {
  const points = [];
  const game = flight({ random: () => .14, onCheckpoint: point => points.push(point) });
  game.configure({ asteroids: false });
  const world = game.world;
  for (let index = 0; index < 3; index++) {
    world.stars.push({ ...world.ship, vy: 0 });
    game.step(.05);
  }
  assert.equal(world.combo, 3);
  assert.equal(world.stats.bestCombo, 3);
  assert.equal(world.multiplier, 2);
  assert.equal(world.score, 40);
  wait(game, 8.1);
  assert.equal(world.multiplier, 1);
  wait(game, 10);
  assert.equal(world.score, 70);
  wait(game, 6);
  assert.equal(world.sector, 1);
  assert.equal(points.at(-1).stats.stars, 3);
  const restored = createGame();
  restored.restore(points.at(-1));
  assert.equal(restored.world.sector, 1);
  assert.equal(restored.world.stats.bestCombo, 3);
  wait(game, 49);
  assert.equal(world.sector, 3);
});

test('Ogni categoria ha una proprietà di volo o resistenza distinta', () => {
  const base = () => ({ radius: 22, vy: 80, vx: 0 });
  const fast = shapeRock(base(), 0, 2);
  const heavy = shapeRock(base(), 1, 0);
  const armor = shapeRock(base(), 1, 2);
  const diagonal = shapeRock(base(), 2, 0);
  const split = shapeRock(base(), 2, 4);
  assert.ok(fast.radius < heavy.radius && fast.vy > heavy.vy);
  assert.equal(armor.hp, 3);
  assert.ok(Math.abs(diagonal.vx) >= 100);
  assert.equal(split.type, 'split');
});

test('Drone: preavviso, corsie evitabili, fasi, Assistita e vittoria con colpi', () => {
  const game = flight();
  game.configure({ difficulty: 'calm', asteroids: false });
  assert.equal(game.action('final'), true);
  const { world } = game;
  assert.equal(world.sector, 4);
  assert.equal(world.boss.max, 16);
  wait(game, 3);
  assert.equal(world.boss.warning.length, 1);
  assert.equal(world.boss.hazards.length, 0);
  wait(game, 1);
  assert.equal(world.boss.hazards.length, 1);
  assert.equal(world.lives, 3);
  for (let i = 0; i < 16; i++) {
    world.shots.push({ x: world.boss.x, y: world.boss.y + 10, radius: 4 });
    game.step(.016);
    if (i === 12) assert.equal(world.boss.phase, 3);
  }
  assert.equal(world.state, State.VICTORY);
  assert.ok(world.finalLeft > 0);
  assert.equal(world.time, 0);
  game.action('recover');
  assert.equal(world.sector, 0);
});

test('Volo prolungato con fuoco, tetti di oggetti e ripresa dal checkpoint', t => {
  const game = flight({ random: () => .47 });
  const { world } = game;
  let peakShots = 0;
  const start = performance.now();
  for (let frame = 0; frame < 108000; frame++) {
    if (world.state === State.GAME_OVER) game.action('checkpoint');
    if (frame % 480 === 0) game.keys.add(FIRE_KEY);
    game.step(1 / 60);
    peakShots = Math.max(peakShots, world.shots.length);
    assert.ok(world.shots.length <= LIMITS.shots);
    assert.ok(world.rocks.length <= LIMITS.rocks);
    assert.ok(world.particles.length <= LIMITS.particles);
  }
  assert.ok(peakShots > 0);
  assert.ok(world.stats.rocks > 0);
  t.diagnostic(`108000 passi, picco proiettili ${peakShots}/${LIMITS.shots}, ${(performance.now() - start).toFixed(1)} ms a parete`);
});
