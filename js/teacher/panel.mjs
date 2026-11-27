import { missionPolicy } from '../missions/policy.mjs';
import { State } from '../game/engine.mjs';
import { missions, MISSION_COUNT } from '../missions/catalog.mjs';

export function bindTeacher({ game, refresh, setLight, audio, syncAudio, center, progress }) {
  const get = id => document.getElementById(id);
  const dialog = get('teacher');
  const confirm = get('teacher-confirm');
  const selector = get('teacher-mission');
  const duration = get('teacher-duration');
  const status = get('teacher-status');
  const answer = get('teacher-answer');
  const solution = get('teacher-solution');
  const picker = get('mission-picker');
  const difficulty = get('teacher-difficulty');
  const rocks = get('teacher-rocks');
  const demo = get('teacher-demo');
  const light = get('teacher-light');
  const muted = get('teacher-mute');
  let resetMode;

  for (const mission of missions) {
    const label = `${mission.id}. ${mission.title}${mission.optional ? ' (facoltativa)' : ''}`;
    selector.add(new Option(label, mission.id));
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = 'secondary';
    button.addEventListener('click', () => {
      picker.close();
      openMission(mission.id);
    });
    button.dataset.missionId = mission.id;
    get('picker-list').append(button);
  }

  function ensureFlight() {
    if (game.world.state === State.MENU || game.world.state === State.TUTORIAL) game.action('start');
    if (game.world.state === State.PAUSED) game.action('resume');
    if (game.world.state === State.FINAL_CHALLENGE) game.action('pause');
    if ([State.PAUSED, State.GAME_OVER, State.VICTORY].includes(game.world.state)) game.action('recover');
  }

  function openMission(id) {
    if (id > game.world.options.missionLimit) return;
    ensureFlight();
    game.openMission(id);
    refresh();
  }

  function applyFlight() {
    if (!duration.checkValidity()) {
      status.textContent = 'Imposta una durata intera fra 10 e 180 secondi.';
      return false;
    }
    game.configure({ duration: duration.valueAsNumber, difficulty: difficulty.value,
      asteroids: rocks.checked, demo: demo.checked });
    status.textContent = demo.checked ? 'Dimostrazione attiva. Gli asteroidi sono sospesi.' : 'Impostazioni di volo applicate.';
    refresh();
    return true;
  }

  function hideSolution() {
    answer.hidden = true;
    solution.setAttribute('aria-expanded', 'false');
    solution.textContent = 'Mostra soluzione';
  }

  const limit = get('teacher-mission-limit');
  const interval = get('teacher-mission-interval');
  const automatic = get('teacher-mission-auto');
  const additions = [...dialog.querySelectorAll('[data-local-add]')];
  function showPolicy() {
    const { missionLimit, missionInterval, missionAuto } = game.world.options;
    limit.value = missionLimit;
    limit.disabled = ![State.MENU, State.TUTORIAL].includes(game.world.state);
    interval.value = missionInterval;
    automatic.textContent = missionAuto ? 'Sospendi stelle automatiche' : 'Riattiva stelle automatiche';
    get('teacher-mission-policy').textContent = `${missionLimit}/${MISSION_COUNT} disponibili · automatiche ${missionAuto ? 'attive' : 'sospese'}`;
    for (const button of additions) button.disabled = missionLimit >= MISSION_COUNT;
    get('teacher-mission-spawn').disabled = [State.MENU, State.TUTORIAL, State.VICTORY, State.FINAL_CHALLENGE].includes(game.world.state);
    for (const option of selector.options) option.disabled = Number(option.value) > missionLimit;
    if (Number(selector.value) > missionLimit) selector.value = '1';
    for (const button of picker.querySelectorAll('[data-mission-id]')) button.hidden = Number(button.dataset.missionId) > missionLimit;
  }
  function changePolicy(options) {
    game.configure(options);
    progress.update({ missionOptions: missionPolicy(game.world.options) });
    showPolicy();
    refresh();
  }
  limit.addEventListener('change', () => {
    if (limit.checkValidity() && !limit.disabled) changePolicy({ missionLimit: limit.valueAsNumber });
  });
  interval.addEventListener('change', () => {
    if (interval.checkValidity()) changePolicy({ missionInterval: interval.valueAsNumber });
  });
  automatic.addEventListener('click', () => changePolicy({ missionAuto: !game.world.options.missionAuto }));
  for (const button of additions) button.addEventListener('click', () => {
    changePolicy({ missionLimit: Math.min(MISSION_COUNT, game.world.options.missionLimit + Number(button.dataset.localAdd)) });
  });
  get('teacher-mission-spawn').addEventListener('click', () => {
    status.textContent = game.requestMissionStar() ? 'Richiesta in coda. La stella può comparire dopo almeno 20 secondi di volo.'
      : 'Una stella Python è già in volo.';
  });

  function openTeacher(live = false) {
    if (!live) game.action('pause');
    refresh();
    const { options } = game.world;
    difficulty.value = options.difficulty;
    duration.value = String(options.duration);
    rocks.checked = options.asteroids;
    demo.checked = options.demo;
    light.checked = game.world.light;
    muted.checked = !audio.enabled;
    status.textContent = '';
    confirm.hidden = true;
    hideSolution();
    showPolicy();
    if (live) dialog.show();
    else dialog.showModal();
  }
  get('flight-mission-options').addEventListener('click', () => openTeacher(true));
  get('teacher-open').addEventListener('click', () => openTeacher());
  document.querySelector('[data-open-teacher]').addEventListener('click', () => openTeacher());
  get('open-unlocked').addEventListener('click', () => {
    game.action('pause');
    showPolicy();
    refresh();
    picker.showModal();
  });
  for (const control of [difficulty, duration, rocks, demo]) control.addEventListener('change', applyFlight);
  light.addEventListener('change', () => setLight(light.checked));
  muted.addEventListener('change', () => {
    audio.configure(muted.checked, audio.volume);
    syncAudio();
    if (audio.enabled) void audio.unlock();
  });
  selector.addEventListener('change', hideSolution);
  solution.addEventListener('click', () => {
    if (!answer.hidden) return hideSolution();
    const index = Number(selector.value) - 1;
    answer.textContent = `${missions[index].title}\n\n${missions[index].solution}\n\n${missions[index].explanation}`;
    answer.hidden = false;
    solution.setAttribute('aria-expanded', 'true');
    solution.textContent = 'Nascondi soluzione';
  });
  get('teacher-launch').addEventListener('click', () => {
    if (!applyFlight()) return;
    dialog.close();
    openMission(Number(selector.value));
  });
  get('teacher-unlock').addEventListener('click', () => {
    changePolicy({ missionLimit: MISSION_COUNT });
    center.unlock();
    status.textContent = 'Tutte le missioni sono accessibili da Scegli missione. I premi si ottengono eseguendo il codice.';
    refresh();
  });
  get('teacher-final').addEventListener('click', () => {
    if (!applyFlight()) return;
    dialog.close();
    ensureFlight();
    game.action('final');
    refresh();
  });
  function showConfirmation(mode) {
    resetMode = mode;
    confirm.hidden = false;
    get('teacher-confirm-yes').focus();
  }
  get('teacher-reset').addEventListener('click', () => showConfirmation('reset'));
  get('teacher-new').addEventListener('click', () => showConfirmation('new'));
  get('teacher-confirm-no').addEventListener('click', () => {
    confirm.hidden = true;
    get(resetMode === 'new' ? 'teacher-new' : 'teacher-reset').focus();
  });
  get('teacher-confirm-yes').addEventListener('click', () => {
    if (!game.reset()) return;
    center.reset();
    progress.reset();
    confirm.hidden = true;
    if (resetMode === 'new') {
      dialog.close();
      game.action('tutorial');
    } else {
      status.textContent = 'Progressi azzerati. Le preferenze audio e grafiche sono conservate.';
      get('teacher-reset').focus();
    }
    refresh();
  });
}
