export const WIDTH = 960;
export const HEIGHT = 540;
export const LIMITS = Object.freeze({ rocks: 16, stars: 8, particles: 90, dt: 0.05 });
export const State = Object.freeze(Object.fromEntries(
  ['MENU', 'TUTORIAL', 'PLAYING', 'PAUSED', 'MISSION', 'GAME_OVER', 'FINAL_CHALLENGE', 'VICTORY']
    .map(name => [name, name]),
));
const transitions = {
  MENU: ['TUTORIAL'],
  TUTORIAL: ['PLAYING', 'MENU'],
  PLAYING: ['PAUSED', 'MISSION', 'GAME_OVER', 'FINAL_CHALLENGE'],
  PAUSED: ['PLAYING', 'FINAL_CHALLENGE', 'MENU'],
  MISSION: ['PLAYING'],
  GAME_OVER: ['PLAYING', 'FINAL_CHALLENGE', 'MENU'],
  FINAL_CHALLENGE: ['PAUSED', 'GAME_OVER', 'VICTORY'],
  VICTORY: ['MENU'],
};

const finalSeconds = 22;
const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
const overlaps = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < (a.radius + b.radius) ** 2;

export function createGame({ random = Math.random, nextMission = () => null, sound = () => {} } = {}) {
  const world = {
    state: State.MENU,
    light: false,
    ship: { x: WIDTH / 2, y: HEIGHT * 0.8, radius: 15, invulnerable: 0 },
    rocks: [], stars: [], particles: [],
    upgrades: { speed: 5, maxLives: 3, shield: false, color: 'rosso', autoShield: false },
    time: 0, score: 0, lives: 3, shield: false, emergency: false,
    finalLeft: finalSeconds, mission: null,
  };
  let checkpoint;
  let pausedFrom;
  let rockIn;
  let starIn;
  let missionIn;
  let shieldCooling;
  const keys = new Set();

  function transition(next) {
    if (!transitions[world.state].includes(next)) return false;
    world.state = next;
    keys.clear();
    return true;
  }

  function checkpointNow(mode = State.PLAYING) {
    checkpoint = { mode, time: world.time, score: world.score };
  }

  function resetSector() {
    Object.assign(world.ship, { x: WIDTH / 2, y: HEIGHT * 0.8, invulnerable: 1.4 });
    world.rocks.length = world.stars.length = world.particles.length = 0;
    world.lives = world.upgrades.maxLives;
    world.shield = world.upgrades.shield;
    world.emergency = world.upgrades.autoShield;
    world.finalLeft = finalSeconds;
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
        resetSector();
        checkpointNow();
        return true;
      case 'pause':
        if (![State.PLAYING, State.FINAL_CHALLENGE].includes(world.state)) return false;
        pausedFrom = world.state;
        return transition(State.PAUSED);
      case 'resume': return world.state === State.PAUSED && transition(pausedFrom);
      case 'checkpoint':
        if (world.state !== State.GAME_OVER || !transition(checkpoint.mode)) return false;
        world.time = checkpoint.time;
        world.score = checkpoint.score;
        resetSector();
        return true;
      case 'final':
        if (!transition(State.FINAL_CHALLENGE)) return false;
        checkpointNow(State.FINAL_CHALLENGE);
        world.rocks.length = world.stars.length = world.particles.length = 0;
        world.finalLeft = finalSeconds;
        world.ship.invulnerable = 1.4;
        rockIn = 0.3;
        return true;
      case 'menu': return transition(State.MENU);
      default: return false;
    }
  }

  function openMission(id) {
    if (id == null || !transition(State.MISSION)) return false;
    world.mission = id;
    return true;
  }

  function closeMission() {
    if (!transition(State.PLAYING)) return false;
    world.mission = null;
    world.ship.invulnerable = Math.max(world.ship.invulnerable, 1);
    missionIn = 3;
    return true;
  }

  function grant(upgrades, reward) {
    Object.assign(world.upgrades, upgrades);
    if (reward === 2) world.lives = world.upgrades.maxLives;
    if (reward === 3) { world.shield = true; sound('shield'); }
    if (reward === 5) world.emergency = true;
    if (reward) checkpointNow();
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
      world.rocks.push(candidate);
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
        world.score += star.mission == null ? 10 : 25;
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
      } else if (world.ship.invulnerable === 0 && overlaps(
        world.shield || (world.emergency && world.lives < 3) ? { ...world.ship, radius: 24 } : world.ship, rock,
      )) {
        world.rocks.splice(index, 1);
        world.ship.invulnerable = 1.25;
        burst(rock.x, rock.y, world.shield || (world.emergency && world.lives < 3) ? '#69dfff' : '#ff8976');
        sound(world.shield || (world.emergency && world.lives < 3) ? 'shield' : 'impact');
        if (world.shield) {
          world.shield = false;
          shieldCooling = 18;
        } else if (world.emergency && world.lives < 3) {
          world.emergency = false;
        } else if (--world.lives === 0) {
          transition(State.GAME_OVER);
          return;
        }
      }
    }
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
    world.time += dt;
    moveShip(dt);
    if (shieldCooling > 0 && (shieldCooling -= dt) <= 0) world.shield = true;
    if ((rockIn -= dt) <= 0) {
      spawnRock(difficulty, final);
      rockIn = final ? 0.54 : 1.65 - difficulty * 0.67;
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
      if (world.finalLeft === 0 && transition(State.VICTORY)) sound('victory');
    }
  }

  return { world, keys, action, step, openMission, closeMission, grant };
}
