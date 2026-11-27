import { State } from '../game/engine.mjs';
import { createPythonRunner } from '../python/runner.mjs';
import { installEditorTools, protectsLines } from './editor-tools.mjs';
import { showInstruments } from './preview.mjs';
import { missions } from './catalog.mjs';
import { boardLines, validateMission } from './validate.mjs';

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
  const updateEditor = installEditorTools(editor, get('line-numbers'), indent, get('code-mirror'));
  const output = get('mission-output');
  const button = get('mission-run');
  const hints = get('mission-hints');
  const hintButton = get('mission-hint');
  const skip = get('mission-skip');
  const done = get('mission-done');
  const final = get('mission-final');
  const retry = get('mission-retry');
  const note = get('mission-note');
  const preview = get('mission-preview');
  const instruments = get('mission-instruments');
  const scenarioPanel = get('mission-cases');
  const explanation = get('mission-explanation');
  const consoleOutput = get('flight-message');
  function flightMessage(text = '') {
    consoleOutput.textContent = text;
    consoleOutput.hidden = !text;
  }
  let active;
  let practice = false;
  let unlocked = false;
  let revision = 0;

  function nextMission() {
    return missions.find(({ id }) => !completed.has(id) && !pending.has(id));
  }

  function syncHints() {
    const count = shownHints.get(practice ? 0 : active.id) ?? 0;
    hints.replaceChildren(...active.indizi.slice(0, count).map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    hintButton.disabled = count >= active.indizi.length;
    hintButton.textContent = count === active.indizi.length ? 'Tre indizi consultati' : `Indizio (${3 - count} disponibili)`;
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
    game.grant({
      ...(progress.state.legacyLives ? { maxLives: 5 } : {}),
      ...(progress.state.legacyShield ? { autoShield: true } : {}),
    });
    for (const mission of missions) {
      if (!completed.has(mission.id)) continue;
      const effect = mission.effettoNelGioco;
      game.grant(effect.colore ? { color: progress.state.paint } : effect.upgrade);
      if (effect.console) flightMessage(mission.scenariDiTest[0].output.join('\n'));
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

    skip.addEventListener('click', leave);
    done.addEventListener('click', leave);
    final.addEventListener('click', () => {
      if (active?.effettoNelGioco.pannello !== 'omega' || status.dataset.result !== 'success') return;
      leave();
      game.action('final');
      refresh();
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      leave();
    });
    retry.addEventListener('click', () => {
      const id = pending.values().next().value;
      if (id && game.openMission(id)) refresh();
    });
    hintButton.addEventListener('click', () => {
      if (!active) return;
      const count = shownHints.get(practice ? 0 : active.id) ?? 0;
      shownHints.set(practice ? 0 : active.id, Math.min(count + 1, active.indizi.length));
      syncHints();
    });
    get('mission-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!active || button.disabled) return;
      const mission = active;
      const source = editor.value;
      if (!protectsLines(mission, source)) {
        status.textContent = 'Controlla le righe grigie. Modifica solo le righe evidenziate.';
        status.dataset.result = 'error';
        return;
      }
      saveDraft();
      const current = ++revision;
      button.disabled = true;
      output.textContent = '';
      scenarioPanel.hidden = true;
      status.textContent = 'Esecuzione in corso…';
      status.dataset.result = 'pending';
      const result = await validateMission(mission, source, run, () => current === revision);
      if (!result || current !== revision) return;
      output.textContent = result.output;
      const cases = result.cases ?? [];
      scenarioPanel.hidden = mission.scenariDiTest.length <= 1 || cases.length === 0;
      scenarioPanel.replaceChildren(...(scenarioPanel.hidden ? [] : cases.map(({ input, variables, output }, index) => {
        const item = document.createElement('span');
        const relevant = Object.keys(mission.scenariDiTest[index].atteso ?? {});
        const values = Object.fromEntries(relevant.filter(name => variables[name]).map(name => [name, variables[name].value]));
        const readings = [...boardLines(values), ...(mission.scenariDiTest[index].output ? [output.trimEnd() || 'Nessuna stampa'] : [])];
        const conditions = boardLines(input).join(', ') || (mission.scenariDiTest[index].rigaAlternativa ? 'Funzione di prova: False' : `Prova ${index + 1}`);
        item.textContent = `${conditions} → ${readings.join(' · ') || 'Nessun valore prodotto'}`;
        return item;
      })));
      status.textContent = result.ok && practice
        ? 'velocita contiene l’intero 10. Python calcola il valore a destra di = prima di assegnarlo.'
        : result.message.replace(/Riga (\d+)\./g,
          (_, row) => `Riga ${Number(row) + mission.variabiliFornite.length}.`);
      status.dataset.result = result.ok ? 'success' : 'error';
      if (result.ok) {
        if (!practice && (!completed.has(mission.id) || mission.effettoNelGioco.colore)) {
          completed.add(mission.id);
          pending.delete(mission.id);
          const effect = mission.effettoNelGioco;
          const paint = effect.colore ? result.variables.colore.value : undefined;
          progress.update({ completed: [...completed], skipped: [...pending], ...(paint ? { paint } : {}) });
          game.grant(paint ? { color: paint } : effect.upgrade, mission.id);
          if (paint) preview.dataset.paint = paint;
        }
        get('mission-effect').textContent = mission.effettoNelGioco.anteprima;
        showInstruments(instruments, mission, result.cases);
        if (!instruments.hidden) preview.querySelector('figcaption').textContent = 'Risultato verificato';
        if (!practice) {
          const message = mission.effettoNelGioco.pannello === 'laser' ? `Laser · Potenza ${result.variables.danno.value}`
            : mission.effettoNelGioco.pannello === 'radio' ? result.variables.messaggio.value : result.output.trimEnd();
          if (message) flightMessage(message);
        }
        sound('success');
        get('reward-text').textContent = practice ? 'Prova riuscita. Il volo inizierà con la configurazione di partenza.' : mission.effettoNelGioco.anteprima;
        reward.hidden = false;
        indent.disabled = true;
        skip.hidden = true;
        done.hidden = false;
        final.hidden = mission.effettoNelGioco.pannello !== 'omega';
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
    show(missions.find(({ id }) => id === world.mission));
  }

  function show(mission, demonstration = false) {
    if (dialog.open) return;
    practice = demonstration;
    active = mission;
    if (!practice && !completed.has(active.id)) {
      pending.delete(active.id);
      pending.add(active.id);
      progress.update({ skipped: [...pending] });
    }
    get('mission-id').textContent = practice ? 'Prova del tutorial' : `Missione ${String(active.id).padStart(2, '0')}`;
    get('mission-title').textContent = active.titolo;
    get('mission-concept').textContent = active.concetto;
    get('mission-problem').querySelector('span').textContent = active.problema;
    get('mission-goal').querySelector('span').textContent = active.cosaFare;
    get('mission-effect').textContent = active.anteprimaDidattica ?? active.effettoNelGioco.anteprima;
    preview.dataset.mission = active.id;
    const samples = active.scenariDiTest[0].input;
    const given = boardLines(Object.fromEntries(active.variabiliFornite.map(name => [name, samples[name]])));
    get('mission-board-lines').textContent = given.map((_, index) => index + 1).join('\n');
    get('mission-board-code').textContent = given.join('\n');
    get('mission-board').hidden = !given.length;
    scenarioPanel.hidden = true;
    explanation.textContent = active.spiegazione;
    explanation.hidden = !explanation.textContent;
    showInstruments(instruments, active);
    preview.querySelector('figcaption').textContent = 'Risultato atteso';
    delete preview.dataset.paint;
    editor.readOnly = false;
    editor.rows = Math.max(4, active.codiceIniziale.split('\n').length);
    reward.hidden = true;
    indent.disabled = false;
    updateEditor(active, practice ? undefined : drafts.get(active.id), given.length);
    sound('mission');
    button.disabled = false;
    status.textContent = 'Modifica il codice e premi Esegui.';
    status.dataset.result = '';
    output.textContent = '';
    skip.hidden = false;
    done.hidden = true;
    final.hidden = true;
    syncHints();
    dialog.showModal();
    editor.focus({ preventScroll: true });
  }

  return {
    bind, onState,
    hasIncomplete: () => completed.size < missions.length,
    completedMissions: () => missions.filter(({ id }) => completed.has(id)),
    unlock() { unlocked = true; },
    reset() { completed.clear(); pending.clear(); drafts.clear(); shownHints.clear(); unlocked = false; flightMessage(); },
    demo: () => show(missions[0], true),
    nextStar: () => nextMission()?.id ?? null,
    count: () => completed.size,
    onRefresh({ world }) {
      const mission = nextMission();
      const retryable = pending.size > 0;
      const text = mission ? `Prossima missione: ${mission.titolo}. Raccogli la stella PYTHON.`
        : retryable ? 'Riprendi le missioni in sospeso.' : 'Tutte le missioni disponibili sono completate.';
      if (note.textContent !== text) note.textContent = text;
      retry.hidden = world.state !== State.PLAYING || !retryable;
      get('open-unlocked').hidden = world.state !== State.PLAYING || !unlocked;
    },
  };
}
