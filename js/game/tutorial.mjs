import { State } from './engine.mjs';

const steps = [
  'Prova le quattro frecce per muovere la navicella.',
  'Aggira l’asteroide e raggiungi la metà superiore del campo.',
  'Raggiungi la stella dorata. Le stelle normali danno punti.',
  'Raggiungi la stella con la scritta PYTHON. Apre il Centro di controllo.',
  'Nel Centro leggi l’obiettivo, prova a modificare il codice e usa Indizio se ti serve una mano.',
];
const directions = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createTutorial() {
  let stage = 0;
  const tried = new Set();
  let showCenter = () => {};

  function enter(world, next) {
    stage = next;
    world.rocks.length = world.stars.length = 0;
    world.rocks.push(...(stage === 1 ? [{ x: world.ship.x, y: 330, radius: 43, angle: 0 }] : []));
    if (stage === 2 || stage === 3) {
      world.stars.push({
        x: world.ship.x < 480 ? Math.min(920, world.ship.x + 110) : Math.max(40, world.ship.x - 110),
        y: Math.max(60, world.ship.y), radius: 20, mission: stage === 3 ? 1 : undefined,
      });
    }
  }

  function update(game) {
    const { world, keys } = game;
    if (world.state !== State.TUTORIAL) return;
    if (stage === 0) {
      for (const key of keys) if (directions.has(key)) tried.add(key);
      if (tried.size === 4) enter(world, 1);
    } else if (stage === 1) {
      const rock = world.rocks[0];
      if (Math.hypot(world.ship.x - rock.x, world.ship.y - rock.y) < rock.radius + world.ship.radius) {
        world.ship.y = 432;
      } else if (world.ship.y < 270) enter(world, 2);
    } else if (stage < 4) {
      const star = world.stars[0];
      if (Math.hypot(world.ship.x - star.x, world.ship.y - star.y) < star.radius + world.ship.radius) {
        enter(world, stage + 1);
        if (stage === 4) {
          keys.clear();
          showCenter();
        }
      }
    }
  }

  return {
    start(world) { tried.clear(); enter(world, 0); },
    next(world) {
      if (stage < 4) {
        enter(world, stage + 1);
        if (stage === 4) showCenter();
      } else showCenter();
    },
    bindCenter(callback) { showCenter = callback; },
    update,
    get text() { return steps[stage]; },
    get last() { return stage === 4; },
  };
}
