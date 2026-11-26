import { State } from '../game/engine.mjs';
import { createPythonRunner } from '../python/runner.mjs';
import { loadCompleted, saveCompleted } from '../storage/progress.mjs';
import { missions } from './catalog.mjs';
import { validateMission } from './validate.mjs';

export function createCenter() {
  const completed = loadCompleted();
  const pending = new Set();
  const drafts = new Map();
  const shownHints = new Map();
  const run = createPythonRunner();
  const get = id => document.getElementById(id);
  const dialog = get('control-center');
  const editor = get('mission-code');
  const status = get('mission-status');
  const output = get('mission-output');
  const button = get('mission-run');
  const hints = get('mission-hints');
  const hintButton = get('mission-hint');
  const skip = get('mission-skip');
  const done = get('mission-done');
  const retry = get('mission-retry');
  const note = get('mission-note');
  let active;
  let revision = 0;

  function nextMission() {
    return missions.find(({ id }) => !completed.has(id));
  }

  function syncHints() {
    const count = shownHints.get(active.id) ?? 0;
    hints.replaceChildren(...active.hints.slice(0, count).map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    hintButton.disabled = count >= active.hints.length;
    hintButton.textContent = count === active.hints.length ? 'Tre indizi consultati' : `Indizio (${count}/3)`;
  }

  function bind(game, refresh) {
    for (const { id, upgrade } of missions) {
      if (completed.has(id)) game.grant(upgrade);
    }

    function leave() {
      if (!active) return;
      revision++;
      run.cancel();
      drafts.set(active.id, editor.value);
      active = undefined;
      dialog.close();
      game.closeMission();
      refresh();
      get('space').focus({ preventScroll: true });
    }

    skip.addEventListener('click', leave);
    done.addEventListener('click', leave);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      leave();
    });
    retry.addEventListener('click', () => {
      const mission = nextMission();
      if (mission && pending.has(mission.id) && game.openMission(mission.id)) refresh();
    });
    hintButton.addEventListener('click', () => {
      if (!active) return;
      const count = shownHints.get(active.id) ?? 0;
      shownHints.set(active.id, Math.min(count + 1, active.hints.length));
      syncHints();
    });
    get('mission-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!active || button.disabled) return;
      const mission = active;
      const source = editor.value;
      drafts.set(mission.id, source);
      const current = ++revision;
      button.disabled = true;
      output.textContent = '';
      status.textContent = 'Esecuzione in corso…';
      status.dataset.result = 'pending';
      const result = await validateMission(mission, source, run, () => current === revision);
      if (!result || current !== revision) return;
      output.textContent = result.output;
      status.textContent = result.message;
      status.dataset.result = result.ok ? 'success' : 'error';
      if (result.ok) {
        completed.add(mission.id);
        pending.delete(mission.id);
        saveCompleted(completed);
        game.grant(mission.upgrade, mission.id);
        skip.hidden = true;
        done.hidden = false;
        editor.readOnly = true;
        done.focus();
        refresh();
      } else {
        button.disabled = false;
      }
    });
  }

  function onState({ world }) {
    if (world.state !== State.MISSION) return;
    active = missions.find(({ id }) => id === world.mission);
    pending.add(active.id);
    get('mission-id').textContent = `Missione ${String(active.id).padStart(2, '0')}${active.optional ? ' · Facoltativa' : ''}`;
    get('mission-title').textContent = active.title;
    get('mission-concept').textContent = active.concept;
    get('mission-goal').textContent = active.goal;
    get('mission-explanation').textContent = active.explanation;
    editor.value = drafts.get(active.id) ?? active.source;
    editor.readOnly = false;
    button.disabled = false;
    status.textContent = 'Modifica il codice e premi Esegui.';
    status.dataset.result = '';
    output.textContent = '';
    skip.hidden = false;
    done.hidden = true;
    syncHints();
    dialog.showModal();
    editor.focus({ preventScroll: true });
  }

  return {
    bind, onState,
    nextStar: () => {
      const mission = nextMission();
      return mission && !pending.has(mission.id) ? mission.id : null;
    },
    count: () => [...completed].filter(id => id <= 4).length,
    onRefresh({ world }) {
      const mission = nextMission();
      const retryable = mission && pending.has(mission.id);
      const text = mission ? (retryable ? `In sospeso: ${mission.title}.`
        : mission.optional ? 'La missione 05 è facoltativa.' : 'Raccogli la stella contrassegnata PYTHON.')
        : 'Tutte le missioni sono completate.';
      if (note.textContent !== text) note.textContent = text;
      retry.hidden = world.state !== State.PLAYING || !retryable;
    },
  };
}
