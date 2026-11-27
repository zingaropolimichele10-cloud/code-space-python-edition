import { State } from '../game/engine.mjs';
import { createPythonRunner } from '../python/runner.mjs';
import { installEditorTools } from './editor-tools.mjs';
import { renderPanel } from './panels.mjs';
import { MAIN_MISSIONS, missions } from './catalog.mjs';
import { validateMission } from './validate.mjs';

export function createCenter({ progress, sound = () => {} }) {
  const completed = new Set(progress.state.completed);
  const pending = new Set(progress.state.skipped);
  const drafts = new Map(Object.entries(progress.state.drafts).map(([id, code]) => [Number(id), code]));
  const shownHints = new Map();
  const run = createPythonRunner();
  const get = id => document.getElementById(id);
  const dialog = get('control-center');
  const editor = get('mission-code');
  const status = get('mission-status');
  const reward = get('mission-reward');
  const indent = get('mission-indent');
  const updateEditor = installEditorTools(editor, get('line-numbers'), indent);
  const output = get('mission-output');
  const button = get('mission-run');
  const hints = get('mission-hints');
  const hintButton = get('mission-hint');
  const skip = get('mission-skip');
  const done = get('mission-done');
  const retry = get('mission-retry');
  const pendingList = get('pending-missions');
  const note = get('mission-note');
  let active;
  let practice = false;
  let unlocked = false;
  let revision = 0;
  let locked = false;
  let skipAllowed = true;
  const maySkip = () => skipAllowed || active?.optional;
  let interrupt = () => {};
  let attempts = 0;
  let errors = 0;
  let since = 0;
  let pauseSince = 0;

  function nextMission() {
    return missions.find(({ id }) => !completed.has(id) && !pending.has(id));
  }

  function syncHints() {
    const count = shownHints.get(practice ? 0 : active.id) ?? 0;
    hints.replaceChildren(...active.hints.slice(0, count).map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    hintButton.disabled = count >= active.hints.length;
    hintButton.textContent = count === active.hints.length ? 'Tre indizi consultati' : `Indizio (${3 - count} disponibili)`;
  }

  function saveDraft(defer = false) {
    if (!active || practice) return;
    drafts.set(active.id, editor.value);
    progress.update({ drafts: Object.fromEntries(drafts) }, defer);
  }

  function bind(game, refresh) {
    editor.addEventListener('input', () => {
      saveDraft(true);
      if (status.dataset.result !== 'pending') return;
      revision++;
      run.cancel();
      button.disabled = false;
      status.dataset.result = '';
      status.textContent = 'Codice modificato. Premi Esegui per verificare questa versione.';
    });
    for (const { id, upgrade } of missions) {
      if (completed.has(id)) game.grant(upgrade);
    }

    function leave() {
      if (!active) return;
      revision++;
      run.cancel();
      saveDraft();
      active = undefined;
      dialog.close();
      if (!practice) game.closeMission();
      refresh();
      get(practice ? 'tutorial-next' : 'space').focus({ preventScroll: true });
      practice = false;
    }

    interrupt = leave;
    skip.addEventListener('click', () => { if (maySkip() && !locked) leave(); });
    done.addEventListener('click', leave);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (!locked && (maySkip() || editor.readOnly)) leave();
    });
    function reopen(id) {
      if (locked || !game.openMission(id)) return;
      pendingList.hidden = true;
      retry.setAttribute('aria-expanded', 'false');
      refresh();
    }
    retry.addEventListener('click', () => {
      if (locked || game.world.state !== State.PLAYING) return;
      const ids = [...pending].sort((a, b) => a - b);
      if (ids.length === 1) return reopen(ids[0]);
      pendingList.hidden = !pendingList.hidden;
      retry.setAttribute('aria-expanded', String(!pendingList.hidden));
      if (pendingList.hidden) return;
      pendingList.replaceChildren(...ids.map(id => {
        const entry = document.createElement('li');
        const choice = document.createElement('button');
        choice.type = 'button';
        choice.className = 'secondary';
        choice.textContent = `${id}. ${missions.find(mission => mission.id === id).title}`;
        choice.addEventListener('click', () => reopen(id));
        entry.append(choice);
        return entry;
      }));
      pendingList.querySelector('button')?.focus();
    });
    hintButton.addEventListener('click', () => {
      if (!active) return;
      const count = shownHints.get(practice ? 0 : active.id) ?? 0;
      shownHints.set(practice ? 0 : active.id, Math.min(count + 1, active.hints.length));
      syncHints();
    });
    get('mission-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!active || button.disabled || locked) return;
      attempts++;
      const mission = active;
      const source = editor.value;
      saveDraft();
      const current = ++revision;
      button.disabled = true;
      output.textContent = '';
      status.textContent = 'Esecuzione in corso…';
      status.dataset.result = 'pending';
      const result = await validateMission(mission, source, run, () => current === revision);
      if (!result || current !== revision) return;
      output.textContent = result.output;
      renderPanel(get('mission-panel'), mission, result.observations);
      status.textContent = result.ok && practice
        ? 'velocita contiene l’intero 10. Python calcola il valore a destra di = prima di assegnarlo.'
        : result.message;
      status.dataset.result = result.ok ? 'success' : 'error';
      if (result.ok) {
        if (!practice && !completed.has(mission.id)) {
          completed.add(mission.id);
          pending.delete(mission.id);
          progress.update({ completed: [...completed], skipped: [...pending] });
          game.grant(mission.upgrade, mission.id);
        }
        sound('success');
        get('reward-text').textContent = practice ? 'Prova riuscita. Il volo inizierà con la configurazione di partenza.' : mission.reward;
        reward.hidden = false;
        indent.disabled = true;
        skip.hidden = true;
        done.hidden = false;
        editor.readOnly = true;
        done.focus();
        refresh();
      } else {
        errors++;
        button.disabled = false;
      }
    });
  }

  function onState({ world }) {
    if (world.state !== State.MISSION) return;
    show(missions.find(({ id }) => id === world.mission));
  }

  function show(mission, demonstration = false) {
    if (dialog.open) return;
    practice = demonstration;
    active = mission;
    attempts = errors = 0;
    since = Date.now();
    pauseSince = 0;
    if (!practice && !completed.has(active.id)) {
      pending.add(active.id);
      progress.update({ skipped: [...pending] });
    }
    get('mission-id').textContent = practice ? 'Prova del tutorial' : `Missione ${String(active.id).padStart(2, '0')}${active.optional ? ' · Facoltativa' : ''}`;
    get('mission-title').textContent = active.title;
    get('mission-concept').textContent = active.concept;
    get('mission-goal').textContent = active.goal;
    get('mission-briefing').textContent = 'Aurora · ' + active.briefing;
    renderPanel(get('mission-panel'), active);
    get('mission-edit').textContent = active.edit;
    get('mission-preview').textContent = active.preview;
    get('mission-preview').dataset.mission = active.id;
    get('mission-scenarios').hidden = active.id !== 7;
    get('mission-explanation').textContent = active.explanation;
    editor.value = (practice ? undefined : drafts.get(active.id)) ?? active.source;
    editor.readOnly = false;
    reward.hidden = true;
    indent.disabled = false;
    updateEditor();
    sound('mission');
    button.disabled = locked;
    status.textContent = 'Modifica il codice e premi Esegui.';
    status.dataset.result = '';
    output.textContent = '';
    skip.hidden = !maySkip();
    done.hidden = true;
    syncHints();
    dialog.showModal();
    editor.focus({ preventScroll: true });
  }

  return {
    bind, onState, interrupt: () => interrupt(),
    observe() {
      const mission = active && !practice ? active.id : 0;
      return { mission, since: mission ? since : 0, attempts: mission ? attempts : 0,
        hints: mission ? (shownHints.get(mission) ?? 0) : 0, errors: mission ? errors : 0 };
    },
    classroomPolicy(game, { blocked, skip: allowSkip, mask }) {
      for (const mission of missions) {
        if ((mask & (1 << (mission.id - 1))) && !completed.has(mission.id)) {
          completed.add(mission.id);
          pending.delete(mission.id);
          game.grant(mission.upgrade);
        }
      }
      skipAllowed = allowSkip;
      if (!active) { locked = blocked; return; }
      if (!locked && blocked) pauseSince = Date.now();
      if (locked && !blocked && pauseSince) { since += Date.now() - pauseSince; pauseSince = 0; }
      if (locked !== blocked && blocked && status.dataset.result === 'pending') {
        revision++;
        run.cancel();
        status.dataset.result = '';
        status.textContent = 'Verifica annullata durante la sospensione. Premi Esegui dopo la ripresa.';
      }
      locked = blocked;
      button.disabled = locked || editor.readOnly || status.dataset.result === 'pending';
      skip.hidden = !maySkip() || editor.readOnly;
      skip.disabled = locked;
    },
    hasIncomplete: () => completed.size < missions.length,
    completedMissions: () => missions.filter(({ id }) => completed.has(id)),
    unlock() { unlocked = true; },
    reset() { completed.clear(); pending.clear(); drafts.clear(); shownHints.clear(); unlocked = false; },
    demo: () => show(missions[0], true),
    nextStar: () => nextMission()?.id ?? null,
    total: () => completed.size,
    count: () => [...completed].filter(id => id <= MAIN_MISSIONS).length,
    onRefresh({ world }) {
      const mission = nextMission();
      const retryable = pending.size > 0;
      const text = mission
        ? `${mission.optional ? 'Missione bonus' : 'Prossima missione'} ${mission.id} · ${mission.title}. Raccogli la stella PYTHON.${retryable ? ' Puoi anche riprendere le missioni in sospeso.' : ''}`
        : retryable ? 'Riprendi le missioni in sospeso per completare il percorso.' : 'Tutte le missioni sono completate.';
      note.hidden = world.state === State.FINAL_CHALLENGE;
      if (note.textContent !== text) note.textContent = text;
      retry.hidden = world.state !== State.PLAYING || !retryable;
      retry.disabled = locked;
      if (retry.hidden || locked) {
        pendingList.hidden = true;
        retry.setAttribute('aria-expanded', 'false');
      }
      get('open-unlocked').hidden = world.state !== State.PLAYING || !unlocked;
    },
  };
}
