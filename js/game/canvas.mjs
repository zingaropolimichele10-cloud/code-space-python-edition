import { HEIGHT, WIDTH } from './engine.mjs';

const sky = Array.from({ length: 145 }, (_, index) => ({
  x: (index * 457.37) % WIDTH, y: (index * 173.23) % HEIGHT, bright: index % 9 === 0,
}));
const shape = [1, 0.87, 0.98, 0.81, 0.95, 0.93, 0.84, 0.98, 0.91];
const maxPixels = 1_350_000;

export function createCanvas(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const backdrop = ctx.createRadialGradient(WIDTH * 0.6, HEIGHT * 0.5, 40, WIDTH * 0.5, HEIGHT * 0.5, 580);
  backdrop.addColorStop(0, '#112d54');
  backdrop.addColorStop(1, '#040917');

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
    ctx.fillStyle = world.light ? '#081529' : backdrop;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const star of sky.slice(0, world.light ? 58 : sky.length)) {
      ctx.fillStyle = star.bright ? '#92bbdf' : '#365677';
      const size = star.bright ? 2 : 1;
      ctx.fillRect(star.x, (star.y + world.time * (star.bright ? 11 : 5)) % HEIGHT, size, size);
    }
    for (const rock of world.rocks) {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.angle);
      polygon(shape.map((ratio, index) => {
        const angle = index / shape.length * Math.PI * 2;
        return [Math.cos(angle) * ratio * rock.radius, Math.sin(angle) * ratio * rock.radius];
      }), '#4a506a', '#a7a9c3');
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
    for (const particle of world.particles) {
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
    if (ship.invulnerable > 0 && Math.sin(ship.invulnerable * 27) < 0) ctx.globalAlpha = 0.48;
    polygon([[-5, 11], [0, 26 + Math.sin(world.time * 30) * 4], [5, 11]], '#57d8ff');
    polygon([[0, -20], [16, 13], [5, 10], [0, 15], [-5, 10], [-16, 13]],
      world.upgrades.color === 'blu' ? '#409bff' : '#ef786a', '#dcecff');
    polygon([[0, -9], [5, 4], [-5, 4]], '#bcf5ff');
    ctx.restore();
  }

  return { draw, resize };
}
