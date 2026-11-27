import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { openBrowser } from './browser.mjs';

const target = process.env.CODESPACE_IMMERSIVE_SHOTS;
const screens = [[1366,768,'pc'],[1920,1080,'full-hd'],[1180,746,'ipad'],[640,700,'split'],[390,650,'compatto']];
const ready = "document.readyState === 'complete' && !!document.getElementById('viewport')";

test('UI immersiva: menu distinto e volo senza scorrimento, cinque finestre e tre terminali', async t => {
  const browser = await openBrowser('', { beforeLoad: 'Math.random = () => .5;' });
  t.after(browser.close);
  const { evaluate, page } = browser;
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const resize = async (width, height) => {
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  };
  const shot = async (name, label) => {
    if (!target) return;
    await mkdir(target, { recursive: true });
    await writeFile(join(target, `${label}-${name}.png`), await browser.screenshot());
  };
  await evaluate(`new Promise(resolve => {
    if (${ready}) resolve();
    else addEventListener('load', resolve, { once: true });
  })`);
  for (const [width, height, label] of screens) {
    await resize(width, height);
    assert.equal(await evaluate(`(() => {
      const menu = document.querySelector('#menu-panel');
      const actions = [...menu.querySelectorAll('nav button:not([hidden]), nav a')];
      return document.querySelector('#cockpit').hidden && !menu.hidden && actions.every(element => {
        const r = element.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1;
      });
    })()`), true, label);
    await shot('menu', label);
  }
  await click('#menu-panel [data-action=tutorial]');
  await click('#tutorial-panel [data-action=start]');
  for (const [width, height, label] of screens) {
    await resize(width, height);
    assert.equal(await evaluate(`(() => {
      const r = document.querySelector('#space').getBoundingClientRect();
      const controls = ['pause-button', 'mute', 'fullscreen', 'final-button'].map(id => document.getElementById(id).getBoundingClientRect());
      return r.height > 120 && Math.abs(r.width / r.height - 16 / 9) < .04 &&
        document.documentElement.scrollHeight <= innerHeight + 1 &&
        controls.every(box => box.width > 0 && box.left >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1);
    })()`), true, label);
    await click('#mission-progress summary');
    assert.equal(await evaluate(`(() => {
      const panel = document.querySelector('.progress-drawer').getBoundingClientRect();
      return panel.width > 0 && panel.left >= 0 && panel.right <= innerWidth + 1;
    })()`), true, label);
    if (label === 'ipad') await shot('progressione', label);
    await click('#mission-progress summary');
    await shot('volo', label);
  }
  for (const [id, width, height, label] of [[1,1366,768,'pc'],[4,1180,746,'ipad'],[8,640,700,'split'],[10,390,650,'compatto']]) {
    await resize(width, height);
    await click('#pause-button');
    await click('[data-open-teacher]');
    await evaluate(`document.querySelector('#teacher-mission').value = '${id}'`);
    await click('#teacher-launch');
    const layout = await evaluate(`(() => {
      const d = document.querySelector('#control-center');
      const box = d.getBoundingClientRect();
      const editor = document.getElementById('mission-code').getBoundingClientRect();
      return [d.open, box.left >= 0, box.right <= innerWidth, box.top >= 0, box.bottom <= innerHeight + 1,
        d.scrollWidth === d.clientWidth, editor.width > 160];
    })()`);
    assert.deepEqual(layout, Array(7).fill(true), label);
    await shot('missione-' + id, label);
    await click('#mission-skip');
  }
  assert.deepEqual(browser.errors, []);
});
