export const SHOT_LIMIT = 24;
export const HAZARD_LIMIT = 12;
export const FIRE_KEY = 'Space';

export const sectors = [
  { name: 'Decollo', glow: '#112d54', planet: '#305582', x: 785, pace: 1, drift: 1 },
  { name: 'Cintura di asteroidi', glow: '#293556', planet: '#826752', x: 730, pace: .90, drift: 1.2 },
  { name: 'Tempesta cosmica', glow: '#3a2052', planet: '#70499b', x: 820, pace: .87, drift: 1.8 },
  { name: 'Zona di emergenza', glow: '#383247', planet: '#aa5345', x: 704, pace: .81, drift: 1.4 },
  { name: 'Scontro conclusivo', glow: '#132e44', planet: '#347886', x: 815, pace: .95, drift: 1.2 },
];

export const rockTypes = {
  normal: { color: '#4a506a', edge: '#a7a9c3', points: 15 },
  fast: { color: '#295968', edge: '#79e1ef', points: 20 },
  heavy: { color: '#6a4b3c', edge: '#ffb47c', points: 25 },
  diagonal: { color: '#51487a', edge: '#c79dff', points: 25 },
  armored: { color: '#4e5761', edge: '#fff0c3', points: 40 },
  split: { color: '#38574d', edge: '#78ebac', points: 35 },
  fragment: { color: '#345044', edge: '#8aeeb3', points: 10 },
};
const patterns = [
  ['normal', 'normal', 'fast', 'normal', 'heavy'],
  ['heavy', 'normal', 'armored', 'fast', 'normal'],
  ['diagonal', 'fast', 'normal', 'diagonal', 'split'],
  ['split', 'armored', 'heavy', 'diagonal', 'fast'],
  ['armored', 'fast', 'diagonal', 'split', 'normal'],
];

export function shapeRock(rock, sector, serial) {
  const type = patterns[sector][serial % patterns[sector].length];
  rock.type = type;
  rock.hp = type === 'armored' ? 3 : 1;
  if (type === 'fast') { rock.radius = 13; rock.vy *= 1.45; }
  if (type === 'heavy') { rock.radius = 36; rock.vy *= .71; }
  if (type === 'diagonal') rock.vx = (serial % 2 ? -1 : 1) * 104;
  if (type === 'split') rock.radius = Math.max(24, rock.radius);
  if (type === 'armored') rock.radius = Math.max(26, rock.radius);
  rock.y = -rock.radius;
  return rock;
}

export function newBoss(options) {
  const assisted = options.demo || options.difficulty === 'calm';
  const hp = assisted ? 16 : options.difficulty === 'hard' ? 36 : 26;
  return { x: 480, y: 83, radius: 57, hp, max: hp, phase: 1, clock: 0,
    next: 3.8, warning: [], hazards: [], cycles: 0, assisted };
}

export function moveBoss(boss, world, dt, sound) {
  boss.clock += dt;
  boss.x = 480 + Math.sin(boss.clock * .68) * 198;
  const hpRatio = boss.hp / boss.max;
  const energyRatio = world.finalLeft / (world.bossDuration || 60);
  boss.phase = hpRatio < .34 || energyRatio < .30 ? 3 : hpRatio < .68 || energyRatio < .65 ? 2 : 1;
  if (world.options.demo) {
    boss.warning = [];
    boss.hazards.length = 0;
    return;
  }

  boss.next -= dt;
  if (boss.next <= 1.05 && boss.warning.length === 0) {
    const lane = boss.cycles % 2 ? 680 : 280;
    boss.warning = boss.assisted || boss.phase === 1 ? [lane]
      : boss.phase === 2 ? [lane - 100, lane + 100] : [lane - 125, lane, lane + 125];
    sound('warning');
  }
  if (boss.next <= 0) {
    for (const x of boss.warning) {
      if (boss.hazards.length === HAZARD_LIMIT) break;
      boss.hazards.push({ x, y: 0, radius: boss.assisted ? 11 : 15 });
    }
    boss.warning = [];
    boss.cycles++;
    boss.next = boss.assisted ? 5.3 : 4.65 - boss.phase * .6;
  }
  for (let index = boss.hazards.length - 1; index >= 0; index--) {
    const pulse = boss.hazards[index];
    pulse.y += (boss.assisted ? 144 : 195 + boss.phase * 23) * dt;
    if (pulse.y > 560) boss.hazards.splice(index, 1);
  }
}
