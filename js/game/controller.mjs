import { createTutorial } from './tutorial.mjs';
import { createCanvas } from './canvas.mjs';
import { createGame, State } from './engine.mjs';

const flying = new Set([State.PLAYING, State.FINAL_CHALLENGE]);
const arrows = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const panels = {
  [State.MENU]: 'menu-panel', [State.TUTORIAL]: 'tutorial-panel',
  [State.PAUSED]: 'paused-panel', [State.GAME_OVER]: 'game-over-panel', [State.VICTORY]: 'victory-panel',
};
const copy = {
  [State.MENU]: ['In attesa', 'Avvia il tutorial per conoscere i comandi.'],
  [State.TUTORIAL]: ['Pronti a partire', 'Prova le quattro frecce prima del decollo.'],
  [State.PLAYING]: ['In volo', 'Raccogli stelle dorate ed evita gli asteroidi.'],
  [State.PAUSED]: ['Volo sospeso', 'Riprendi quando sei pronto.'],
  [State.MISSION]: ['Centro di controllo', 'Il volo riprenderà quando chiuderai la missione.'],
  [State.GAME_OVER]: ['Checkpoint disponibile', 'Riparti con tutte le vite.'],
  [State.FINAL_CHALLENGE]: ['Sfida finale', 'Sopravvivi a un settore con più asteroidi.'],
  [State.VICTORY]: ['Settore superato', 'La navicella è al sicuro.'],
};

export function mountGame({ nextMission, finalReady = world => world.time >= 25, onState = () => {},
  missionCount = () => 0, sound, onRefresh = () => {} } = {}) {
  const game = createGame({ nextMission, sound });
  const { world, keys } = game;
  const byId = id => document.getElementById(id);
  const tutorial = createTutorial();
  const canvas = createCanvas(byId('space'));
  const hud = Object.fromEntries(['lives', 'score', 'mission-count', 'speed', 'shield', 'flight-status', 'flight-note']
    .map(id => [id, byId(id)]));
  const set = (id, value) => {
    if (hud[id].textContent !== value) hud[id].textContent = value;
  };
  let renderedState;

  function refresh() {
    if (renderedState !== world.state) {
      renderedState = world.state;
      byId('viewport').dataset.state = world.state;
      byId('overlay').hidden = !(world.state in panels);
      for (const [state, id] of Object.entries(panels)) byId(id).hidden = state !== world.state;
      byId('pause-button').hidden = !flying.has(world.state);
      if (world.state === State.TUTORIAL) tutorial.start(world);
      set('flight-status', copy[world.state][0]);
      if (panels[world.state]) byId(panels[world.state]).querySelector('button')?.focus({ preventScroll: true });
      onState(game);
    }
    set('flight-note', world.state === State.FINAL_CHALLENGE
      ? `Tempo rimanente: ${Math.max(0, Math.ceil(world.finalLeft))} s`
      : copy[world.state][1]);
    set('lives', `${world.lives} / ${world.upgrades.maxLives}`);
    set('score', String(world.score));
    set('speed', String(world.upgrades.speed));
    set('mission-count', `${missionCount()} / 4`);
    set('shield', world.shield ? 'Attivo' : world.emergency && world.lives < 3 ? 'Emergenza'
      : world.upgrades.shield ? 'In ricarica' : 'Spento');
    byId('final-button').hidden = !(world.state === State.PLAYING && finalReady(world));
    if (world.state === State.TUTORIAL) {
      const text = byId('tutorial-text');
      const button = byId('tutorial-next');
      if (text.textContent !== tutorial.text) text.textContent = tutorial.text;
      const label = tutorial.last ? 'Prova il Centro di controllo' : 'Prossima prova';
      if (button.textContent !== label) button.textContent = label;
    }
    onRefresh(game);
  }

  byId('tutorial-next').addEventListener('click', () => { tutorial.next(world); refresh(); });
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.action !== 'final' || finalReady(world)) game.action(button.dataset.action);
    refresh();
  }));
  addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || event.target.closest?.('textarea, input:not([type=checkbox]), select, [contenteditable]')) return;
    if (event.key === 'Escape' && !event.repeat) {
      if (game.action(world.state === State.PAUSED ? 'resume' : 'pause')) event.preventDefault();
      refresh();
    } else if (arrows.has(event.key) && (flying.has(world.state) || world.state === State.TUTORIAL)) {
      event.preventDefault();
      keys.add(event.key);
    }
  });
  addEventListener('keyup', event => keys.delete(event.key));
  const handleBlur = () => {
    keys.clear();
    game.action('pause');
    refresh();
  };
  addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) handleBlur();
  });
  byId('light').addEventListener('change', event => {
    world.light = event.target.checked;
    if (world.light) world.particles.length = 0;
    canvas.resize(world.light);
  });
  const settings = byId('settings');
  const light = byId('light');
  const settingsLight = byId('settings-light');
  byId('settings-open').addEventListener('click', () => {
    game.action('pause');
    refresh();
    settingsLight.checked = light.checked;
    settings.showModal();
  });
  settingsLight.addEventListener('change', () => {
    light.checked = settingsLight.checked;
    light.dispatchEvent(new Event('change'));
  });
  new ResizeObserver(() => canvas.resize(world.light)).observe(byId('space'));
  canvas.resize(world.light);
  refresh();
  let previous;
  function frame(now) {
    game.step(previous === undefined ? 0 : (now - previous) / 1000);
    previous = now;
    tutorial.update(game);
    refresh();
    canvas.draw(world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { game, refresh, tutorial };
}
