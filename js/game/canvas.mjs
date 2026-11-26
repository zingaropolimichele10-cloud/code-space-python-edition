import { rockTypes, sectors } from './arcade.mjs';
import { HEIGHT, WIDTH } from './engine.mjs';

const sky = Array.from({ length: 145 }, (_, index) => ({
  x: (index * 457.37) % WIDTH, y: (index * 173.23) % HEIGHT, bright: index % 9 === 0,
}));
const shape = [1, 0.87, 0.98, 0.81, 0.95, 0.93, 0.84, 0.98, 0.91];
const maxPixels = 1_350_000;

export function createCanvas(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const backgrounds = sectors.map(sector => {
    const planet = ctx.createRadialGradient(sector.x - 41, 116, 10, sector.x, 145, 104);
    planet.addColorStop(0, sector.planet);
    planet.addColorStop(.72, '#17294b');
    planet.addColorStop(1, '#0d1932');
    const backdrop = ctx.createRadialGradient(WIDTH * .6, HEIGHT * .5, 40, WIDTH * .5, HEIGHT * .5, 580);
    backdrop.addColorStop(0, sector.glow);
    backdrop.addColorStop(1, '#040917');
    return { planet, backdrop };
  });

  function resize(light) {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(light ? 1 : (devicePixelRatio || 1), 1.75,
      Math.sqrt(maxPixels / Math.max(1, bounds.width * bounds.height)));
    const width = Math.max(1, Math.round(bounds.width * scale));
    const height = Math.max(1, Math.round(bounds.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function polygon(points, fill, stroke) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function circle(x, y, radius, stroke, fill) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function draw(world) {
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    const sector = sectors[world.sector];
    const { planet, backdrop } = backgrounds[world.sector];
    ctx.fillStyle = world.light ? sector.glow : backdrop;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (!world.light) {
      circle(sector.x, 145, 104, '#40658a', planet);
      ctx.beginPath();
      ctx.ellipse(sector.x, 145, 146, 22, -0.24, 0, Math.PI);
      ctx.strokeStyle = '#50709499';
      ctx.stroke();
    }
    for (let index = 0; index < (world.light ? 58 : sky.length); index++) {
      const star = sky[index];
      ctx.fillStyle = star.bright ? '#92bbdf' : '#365677';
      const size = star.bright ? 2 : 1;
      ctx.fillRect(star.x, (star.y + (reduced.matches ? 0 : world.time * sector.drift * (star.bright ? 11 : index % 2 ? 5 : 2))) % HEIGHT, size, size);
    }
    if (world.boss) {
      const boss = world.boss;
      for (const x of boss.warning) {
        ctx.fillStyle = '#ff9e6425';
        ctx.fillRect(x - 17, 0, 34, HEIGHT);
        ctx.strokeStyle = '#ffaf79';
        ctx.strokeRect(x - 17, 0, 34, HEIGHT);
      }
      for (const pulse of boss.hazards) circle(pulse.x, pulse.y, pulse.radius, '#ffe1aa', '#f39760');
      ctx.save();
      ctx.translate(boss.x, boss.y);
      polygon([[-62, 12], [-43, -33], [-17, -20], [0, -39], [17, -20], [43, -33], [62, 12], [37, 38], [-37, 38]],
        '#20334e', '#f6ba83');
      polygon([[-29, 0], [0, -19], [29, 0], [0, 25]], '#382844', '#ffad72');
      circle(0, 2, 9 + boss.phase * 2, '#fff3cf', '#ff9364');
      ctx.restore();
    }
    for (const shot of world.shots) {
      ctx.fillStyle = '#63dfff';
      ctx.fillRect(shot.x - 2, shot.y, 4, 13);
      ctx.fillStyle = '#e5fbff';
      ctx.fillRect(shot.x - 1, shot.y, 2, 6);
    }
    for (const rock of world.rocks) {
      const type = rockTypes[rock.type] ?? rockTypes.normal;
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.angle);
      polygon(shape.map((ratio, index) => {
        const angle = index / shape.length * Math.PI * 2;
        return [Math.cos(angle) * (ratio - (index % 3 === 0 ? (Math.round(rock.radius) % 5) * .027 : 0)) * rock.radius, Math.sin(angle) * (ratio - (index % 3 === 0 ? (Math.round(rock.radius) % 5) * .027 : 0)) * rock.radius];
      }), type.color, type.edge);
      if (rock.type === 'armored') {
        ctx.fillStyle = type.edge;
        for (let mark = 0; mark < rock.hp; mark++) ctx.fillRect(-10 + mark * 8, -9, 5, 4);
      }
      if (rock.type === 'split') polygon([[-11, -3], [1, -5], [10, 3], [-1, 3]], type.edge);
      circle(-rock.radius * 0.24, rock.radius * 0.15, rock.radius * 0.22, '#737991', '#34394f');
      circle(rock.radius * 0.38, -rock.radius * 0.29, rock.radius * 0.14, null, '#34394f');
      ctx.restore();
    }
    for (const star of world.stars) {
      if (star.mission != null) {
        circle(star.x, star.y, 24, '#ffd777', '#403617');
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff1be';
        ctx.fillText('PYTHON', star.x, star.y - 32);
      }
      polygon(Array.from({ length: 10 }, (_, index) => {
        const angle = index * Math.PI / 5 - Math.PI / 2;
        const radius = star.radius * (index % 2 ? 0.44 : 0.96);
        return [star.x + Math.cos(angle) * radius, star.y + Math.sin(angle) * radius];
      }), '#ffd36b', '#fff2c2');
    }
    for (const particle of reduced.matches ? [] : world.particles) {
      ctx.globalAlpha = Math.min(1, particle.ttl * 3);
      circle(particle.x, particle.y, 2, null, particle.color);
    }
    ctx.globalAlpha = 1;
    const { ship } = world;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    if (world.shield || (world.emergency && world.lives < 3)) {
      circle(0, 0, 24, '#81ecff', '#23b8ff25');
    }
    if (world.shieldFlash > 0 || world.rewardFlash > 0) {
      const flash = Math.max(world.shieldFlash, world.rewardFlash * .44);
      ctx.globalAlpha = Math.min(.82, flash * 1.6);
      circle(0, 0, reduced.matches ? 29 : 44 - flash * 22, '#fff0ac');
      ctx.globalAlpha = 1;
    }
    if (!reduced.matches && ship.invulnerable > 0 && Math.sin(ship.invulnerable * 27) < 0) ctx.globalAlpha = 0.48;
    const turbo = world.upgrades.speed > 5;
    const flame = 26 + (turbo ? 14 : 0) + (reduced.matches ? 0 : Math.sin(world.time * 30) * 4);
    const trail = world.upgrades.color === 'blu' ? '#7eebff' : turbo ? '#ffca79' : '#57d8ff';
    polygon([[-5, 11], [0, flame], [5, 11]], trail);
    if (turbo && !world.light) {
      polygon([[-12, 12], [-9, flame - 5], [-6, 12]], trail);
      polygon([[6, 12], [9, flame - 5], [12, 12]], trail);
    }
    polygon([[0, -20], [16, 13], [5, 10], [0, 15], [-5, 10], [-16, 13]],
      world.upgrades.color === 'blu' ? '#409bff' : '#ef786a', '#dcecff');
    polygon([[0, -9], [5, 4], [-5, 4]], '#bcf5ff');
    ctx.fillStyle = '#5ee8ff';
    ctx.fillRect(-12, 8, 3, 2);
    ctx.fillRect(9, 8, 3, 2);
    ctx.restore();
  }

  return { draw, resize };
}
