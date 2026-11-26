import { State } from '../game/engine.mjs';
import { missions } from '../missions/catalog.mjs';

const solutions = [
  'velocita = 10', 'vite = 5', 'scudo = True', 'colore = "blu"',
  'scudo = False\nif vite < 3:\n    scudo = True',
];

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
    get('picker-list').append(button);
  }

  function ensureFlight() {
    if (game.world.state === State.MENU || game.world.state === State.TUTORIAL) game.action('start');
    if (game.world.state === State.PAUSED) game.action('resume');
    if (game.world.state === State.FINAL_CHALLENGE) game.action('pause');
    if ([State.PAUSED, State.GAME_OVER, State.VICTORY].includes(game.world.state)) game.action('recover');
  }

  function openMission(id) {
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

  get('teacher-open').addEventListener('click', () => {
    game.action('pause');
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
    dialog.showModal();
  });
  get('open-unlocked').addEventListener('click', () => {
    game.action('pause');
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
    answer.textContent = `${missions[index].title}\n\n${solutions[index]}\n\n${missions[index].explanation}`;
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
