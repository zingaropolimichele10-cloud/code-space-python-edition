import { FIRE_KEY, HAZARD_LIMIT, SHOT_LIMIT, moveBoss, newBoss, rockTypes, sectors, shapeRock } from './arcade.mjs';

export const WIDTH = 960;
export const HEIGHT = 540;
export const LIMITS = Object.freeze({ rocks: 16, stars: 8, particles: 90, shots: SHOT_LIMIT, hazards: HAZARD_LIMIT, dt: 0.05 });
export const State = Object.freeze(Object.fromEntries(
  ['MENU', 'TUTORIAL', 'PLAYING', 'PAUSED', 'MISSION', 'GAME_OVER', 'FINAL_CHALLENGE', 'VICTORY']
    .map(name => [name, name]),
));
const transitions = {
  MENU: ['TUTORIAL', 'PLAYING', 'FINAL_CHALLENGE'],
  TUTORIAL: ['PLAYING', 'MENU'],
  PLAYING: ['PAUSED', 'MISSION', 'GAME_OVER', 'FINAL_CHALLENGE'],
  PAUSED: ['PLAYING', 'FINAL_CHALLENGE', 'MENU'],
  MISSION: ['PLAYING'],
  GAME_OVER: ['PLAYING', 'FINAL_CHALLENGE', 'MENU'],
  FINAL_CHALLENGE: ['PAUSED', 'GAME_OVER', 'VICTORY'],
  VICTORY: ['MENU', 'PLAYING'],
};

export const DEFAULT_FLIGHT = Object.freeze({ duration: 60, difficulty: 'standard', asteroids: true, demo: false });
const difficultyScale = { calm: 0.65, standard: 1, hard: 1.35 };
const baseUpgrades = { speed: 5, maxLives: 3, shield: false, color: 'rosso', autoShield: false };
const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
const overlaps = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < (a.radius + b.radius) ** 2;

export function createGame({ random = Math.random, nextMission = () => null, sound = () => {}, onCheckpoint = () => {} } = {}) {
  const world = {
    state: State.MENU,
    light: false,
    ship: { x: WIDTH / 2, y: HEIGHT * 0.8, radius: 15, invulnerable: 0 },
    rocks: [], stars: [], particles: [], shots: [], boss: null, sector: 0,
    stats: { rocks: 0, stars: 0, bestCombo: 0 }, combo: 0, multiplier: 1,
    notice: '', noticeLeft: 0, rewardFlash: 0, shieldFlash: 0,
    upgrades: { ...baseUpgrades },
    options: { ...DEFAULT_FLIGHT },
    time: 0, score: 0, lives: 3, shield: false, emergency: false,
    finalLeft: DEFAULT_FLIGHT.duration, mission: null,
  };
  let checkpoint;
  let challengeDuration = DEFAULT_FLIGHT.duration;
  let pausedFrom;
  let rockIn;
  let starIn;
  let missionIn;
  let shieldCooling;
  let serial, shotIn, comboLeft, safeTime;
  const keys = new Set();

  function transition(next) {
    if (!transitions[world.state].includes(next)) return false;
    world.state = next;
    keys.clear();
    return true;
  }

  function checkpointNow(mode = State.PLAYING) {
    checkpoint = { mode, time: world.time, score: world.score };
    if (mode === State.FINAL_CHALLENGE) checkpoint.duration = challengeDuration;
    if (Object.values(world.stats).some(Boolean)) checkpoint.stats = { ...world.stats };
    onCheckpoint(checkpoint);
  }

  function resetSector(duration = world.options.duration) {
    Object.assign(world.ship, { x: WIDTH / 2, y: HEIGHT * 0.8, invulnerable: 1.4 });
    world.rocks.length = world.stars.length = world.particles.length = world.shots.length = 0;
    world.boss = world.state === State.FINAL_CHALLENGE ? newBoss(world.options) : null;
    world.sector = world.boss ? 4 : Math.min(3, Math.floor(world.time / 24));
    world.bossDuration = duration;
    world.combo = 0;
    world.multiplier = 1;
    world.noticeLeft = world.rewardFlash = world.shieldFlash = 0;
    serial = shotIn = comboLeft = safeTime = 0;
    world.lives = world.upgrades.maxLives;
    world.shield = world.upgrades.shield;
    world.emergency = world.upgrades.autoShield;
    challengeDuration = duration;
    world.finalLeft = challengeDuration;
    rockIn = 1.4;
    starIn = 0.7;
    missionIn = 2.5;
    shieldCooling = 0;
  }

  function action(name) {
    switch (name) {
      case 'tutorial':
        if (!transition(State.TUTORIAL)) return false;
        resetSector();
        world.ship.invulnerable = 0;
        return true;
      case 'start':
        if (!transition(State.PLAYING)) return false;
        world.time = world.score = 0;
        clearStats();
        resetSector();
        checkpointNow();
        return true;
      case 'pause':
        if (![State.PLAYING, State.FINAL_CHALLENGE].includes(world.state)) return false;
        pausedFrom = world.state;
        return transition(State.PAUSED);
      case 'resume': return world.state === State.PAUSED && transition(pausedFrom);
      case 'recover':
        if (!transition(State.PLAYING)) return false;
        resetSector();
        checkpointNow();
        return true;
      case 'checkpoint':
        if (world.state !== State.GAME_OVER || !checkpoint || !transition(checkpoint.mode)) return false;
        world.time = checkpoint.time;
        world.score = checkpoint.score;
        clearStats(checkpoint.stats);
        resetSector(checkpoint.duration);
        return true;
      case 'final':
        if (world.state !== State.PLAYING || !transition(State.FINAL_CHALLENGE)) return false;
        world.rocks.length = world.stars.length = world.particles.length = world.shots.length = 0;
        world.boss = newBoss(world.options);
        world.sector = 4;
        world.bossDuration = world.options.duration;
        announce('Settore finale · Scontro conclusivo');
        challengeDuration = world.options.duration;
        world.finalLeft = challengeDuration;
        checkpointNow(State.FINAL_CHALLENGE);
        world.ship.invulnerable = 1.4;
        rockIn = 0.3;
        return true;
      case 'menu': return transition(State.MENU);
      default: return false;
    }
  }

  function openMission(id) {
    if (id == null || !transition(State.MISSION)) return false;
    world.stars = world.stars.filter(star => star.mission !== id);
    world.mission = id;
    return true;
  }

  function closeMission() {
    if (world.state !== State.MISSION || !transition(State.PLAYING)) return false;
    world.mission = null;
    world.ship.invulnerable = Math.max(world.ship.invulnerable, 1);
    missionIn = 3;
    return true;
  }

  function restore(point) {
    if (!point || world.state !== State.MENU || !transition(point.mode)) return false;
    world.score = point.score;
    world.time = point.time;
    clearStats(point.stats);
    resetSector(point.duration);
    checkpointNow(point.mode);
    return true;
  }

  function reset() {
    if (world.state === State.MISSION) return false;
    if (world.state !== State.MENU) {
      if (world.state === State.PLAYING || world.state === State.FINAL_CHALLENGE) action('pause');
      if (!action('menu')) return false;
    }
    world.time = world.score = 0;
    world.mission = null;
    clearStats();
    Object.assign(world.upgrades, baseUpgrades);
    resetSector();
    checkpoint = undefined;
    return true;
  }

  function configure(options) {
    Object.assign(world.options, options);
    if (!world.options.asteroids || world.options.demo) world.rocks.length = 0;
  }

  function grant(upgrades, reward) {
    Object.assign(world.upgrades, upgrades);
    if (reward === 2) world.lives = world.upgrades.maxLives;
    if (reward === 3) { world.shield = true; sound('shield'); }
    if (reward === 5) world.emergency = true;
    if (reward) {
      world.rewardFlash = 1.25;
      announce(['', 'Propulsori turbo', 'Riparazione completata', 'Scudo installato', 'Rivestimento personalizzato', 'Riserva d’emergenza pronta'][reward]);
      checkpointNow();
    }
  }

  function burst(x, y, color) {
    if (world.light) return;
    for (let index = 0; index < 10 && world.particles.length < LIMITS.particles; index++) {
      const angle = random() * Math.PI * 2;
      const speed = 30 + random() * 145;
      world.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, ttl: 0.45, color });
    }
  }

  function moveShip(dt) {
    const x = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
    const y = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
    const speed = world.upgrades.speed * 38 * dt / (Math.hypot(x, y) || 1);
    const { ship } = world;
    ship.x = clamp(ship.x + x * speed, 20, WIDTH - 20);
    ship.y = clamp(ship.y + y * speed, 20, HEIGHT - 20);
    ship.invulnerable = Math.max(0, ship.invulnerable - dt);
  }

  function spawnRock(difficulty, final) {
    const radius = 13 + random() * 23;
    const candidate = {
      x: radius + random() * (WIDTH - 2 * radius), y: -radius,
      radius, vx: (random() - 0.5) * (32 + difficulty * 38),
      vy: 52 + random() * 36 + difficulty * 66 + (final ? 35 : 0),
      angle: random() * Math.PI * 2, spin: (random() - 0.5) * 2,
    };
    // Una fascia già occupata lascia spazio per aggirare gli ostacoli.
    if (world.rocks.length < LIMITS.rocks &&
        !world.rocks.some(rock => rock.y < 105 && Math.abs(rock.x - candidate.x) < 115)) {
      world.rocks.push(shapeRock(candidate, world.sector, serial++));
    }
  }

  function spawnStar(mission) {
    if (mission == null) {
      if (world.stars.length >= LIMITS.stars - 1) return;
      world.stars.push({ x: 45 + random() * (WIDTH - 90), y: -12, radius: 13, vy: 44 });
      return;
    }
    if (world.stars.length >= LIMITS.stars || world.stars.some(star => star.mission != null)) return;
    const { x, y } = world.ship;
    world.stars.push({ x: clamp(x + (x < WIDTH / 2 ? 94 : -94), 28, WIDTH - 28),
      y: clamp(y, 48, HEIGHT - 24), radius: 20, vy: 0, mission, age: 0 });
  }

  function updateStars(dt) {
    for (let index = world.stars.length - 1; index >= 0; index--) {
      const star = world.stars[index];
      star.y += star.vy * dt;
      if (star.mission != null && (star.age += dt) >= 7) {
        const dx = world.ship.x - star.x;
        const dy = world.ship.y - star.y;
        const distance = Math.hypot(dx, dy);
        const fraction = distance ? Math.min(1, 480 * dt / distance) : 0;
        star.x += dx * fraction;
        star.y += dy * fraction;
      }
      if (star.y > HEIGHT + star.radius) {
        world.stars.splice(index, 1);
      } else if (overlaps(world.ship, star)) {
        world.stars.splice(index, 1);
        sound('star');
        world.stats.stars++;
        world.combo++;
        world.stats.bestCombo = Math.max(world.stats.bestCombo, world.combo);
        comboLeft = 8;
        world.multiplier = Math.min(3, 1 + Math.floor((world.combo - 1) / 2));
        world.score += (star.mission == null ? 10 : 25) * world.multiplier;
        if (world.combo > 1) { announce(`Combo ${world.combo} · ×${world.multiplier}`); sound('combo'); }
        burst(star.x, star.y, '#ffd577');
        if (star.mission != null && openMission(star.mission)) return;
      }
    }
  }

  function updateRocks(dt) {
    for (let index = world.rocks.length - 1; index >= 0; index--) {
      const rock = world.rocks[index];
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.angle += rock.spin * dt;
      if (rock.y > HEIGHT + rock.radius || rock.x < -rock.radius || rock.x > WIDTH + rock.radius) {
        world.rocks.splice(index, 1);
      } else if (touchesShip(rock)) {
        world.rocks.splice(index, 1);
        takeHit(rock);
        if (world.state === State.GAME_OVER) return;
      }
    }
  }

  function announce(text) {
    world.notice = text;
    world.noticeLeft = 2.2;
  }

  function clearStats(previous) {
    world.stats = { rocks: 0, stars: 0, bestCombo: 0, ...previous };
  }

  function protectedShip() {
    return world.shield || (world.emergency && world.lives < 3);
  }

  function touchesShip(obstacle) {
    return world.ship.invulnerable === 0 && overlaps(
      protectedShip() ? { ...world.ship, radius: 24 } : world.ship, obstacle,
    );
  }

  function takeHit(obstacle) {
    const shielded = protectedShip();
    world.ship.invulnerable = 1.25;
    safeTime = 0;
    burst(obstacle.x, obstacle.y, shielded ? '#69dfff' : '#ff8976');
    sound(shielded ? 'shield' : 'impact');
    if (shielded) {
      world.shieldFlash = .55;
      if (world.shield) {
        world.shield = false;
        shieldCooling = 18;
      } else world.emergency = false;
    } else if (--world.lives === 0) transition(State.GAME_OVER);
  }

  function destroyRock(index) {
    const [rock] = world.rocks.splice(index, 1);
    world.stats.rocks++;
    const type = rockTypes[rock.type] ?? rockTypes.normal;
    world.score += type.points * world.multiplier;
    burst(rock.x, rock.y, type.edge);
    sound('destroy');
    if (rock.type === 'split') {
      for (const side of [-1, 1]) {
        if (world.rocks.length >= LIMITS.rocks) break;
        world.rocks.push({ x: rock.x + side * 11, y: rock.y, radius: 9, vx: side * 118,
          vy: rock.vy * 1.15, spin: side * 2, angle: rock.angle, type: 'fragment', hp: 1 });
      }
    }
  }

  function shotHits(shot, target, previousY) {
    const y = Math.max(shot.y, Math.min(previousY, target.y));
    return overlaps({ x: shot.x, y, radius: shot.radius }, target);
  }

  function updateShots(dt) {
    shotIn -= dt;
    if (keys.has(FIRE_KEY) && shotIn <= 0 && world.shots.length < LIMITS.shots) {
      world.shots.push({ x: world.ship.x, y: world.ship.y - 19, radius: 4 });
      shotIn = .205;
      sound('fire');
    }
    for (let index = world.shots.length - 1; index >= 0; index--) {
      const shot = world.shots[index];
      const previousY = shot.y;
      shot.y -= dt * 610;
      const target = world.rocks.findIndex(rock => shotHits(shot, rock, previousY));
      if (target !== -1) {
        const rock = world.rocks[target];
        rock.hp = (rock.hp ?? 1) - 1;
        if (rock.hp <= 0) destroyRock(target);
        else { burst(shot.x, shot.y, '#ffd8a0'); sound('ping'); }
      } else if (world.boss && shotHits(shot, world.boss, previousY)) {
        world.boss.hp = Math.max(0, world.boss.hp - 1);
        burst(shot.x, shot.y, '#87e5ff');
        sound('ping');
      } else if (shot.y > -8) continue;
      world.shots.splice(index, 1);
    }
  }

  function advanceFlight(dt, final) {
    world.noticeLeft = Math.max(0, world.noticeLeft - dt);
    world.rewardFlash = Math.max(0, world.rewardFlash - dt);
    world.shieldFlash = Math.max(0, world.shieldFlash - dt);
    if (comboLeft > 0 && (comboLeft -= dt) <= 0) {
      world.combo = 0;
      world.multiplier = 1;
    }
    safeTime += dt;
    if (safeTime >= 18) {
      safeTime -= 18;
      world.score += 30 * world.multiplier;
      announce(`Volo pulito · +${30 * world.multiplier} punti`);
      sound('combo');
    }
    if (final) {
      moveBoss(world.boss, world, dt, sound);
      const hazards = world.boss.hazards;
      for (let index = hazards.length - 1; index >= 0; index--) {
        if (touchesShip(hazards[index])) {
          takeHit(hazards[index]);
          hazards.splice(index, 1);
          if (world.state === State.GAME_OVER) return;
        }
      }
    } else {
      const sector = Math.min(3, Math.floor(world.time / 24));
      if (sector !== world.sector) {
        world.sector = sector;
        announce(`Settore 0${sector + 1} · ${sectors[sector].name}`);
        sound('sector');
        checkpointNow();
      }
    }
    updateShots(dt);
  }

  function step(elapsed) {
    const dt = clamp(elapsed, 0, LIMITS.dt);
    if (world.state === State.TUTORIAL) {
      moveShip(dt);
      return;
    }
    if (world.state !== State.PLAYING && world.state !== State.FINAL_CHALLENGE) return;
    const final = world.state === State.FINAL_CHALLENGE;
    const difficulty = Math.min(world.time / 150, 1);
    const finalStage = final ? 1 - world.finalLeft / challengeDuration : 0;
    const multiplier = difficultyScale[world.options.difficulty];
    if (!final) world.time += dt;
    moveShip(dt);
    advanceFlight(dt, final);
    if (world.state === State.GAME_OVER) return;
    if (shieldCooling > 0 && (shieldCooling -= dt) <= 0) world.shield = true;
    if ((rockIn -= dt) <= 0) {
      if (world.options.asteroids && !world.options.demo) {
        spawnRock((difficulty + finalStage * .7) * multiplier, final);
      }
      rockIn = (final ? .87 - finalStage * .4 : 1.65 - difficulty * .67) * sectors[world.sector].pace / multiplier;
    }
    if ((starIn -= dt) <= 0) {
      spawnStar(null);
      starIn = 2.2;
    }
    if (!final && (missionIn -= dt) <= 0) {
      spawnStar(nextMission());
      missionIn = 2.5;
    }
    updateStars(dt);
    if (world.state === State.MISSION) return;
    updateRocks(dt);
    if (world.state === State.GAME_OVER) return;
    for (let index = world.particles.length - 1; index >= 0; index--) {
      const particle = world.particles[index];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if ((particle.ttl -= dt) <= 0) world.particles.splice(index, 1);
    }
    if (final) {
      world.finalLeft = Math.max(0, world.finalLeft - dt);
      if (world.finalLeft === 0 || world.boss.hp === 0) {
        world.score += world.boss.hp === 0 ? 200 : 100;
        transition(State.VICTORY);
        sound('victory');
      }
    }
  }

  return { world, keys, action, step, openMission, closeMission, grant, restore, reset, configure };
}
