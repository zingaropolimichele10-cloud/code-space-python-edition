import { downloadFile, readJson } from '../storage/files.mjs';
import { MAIN_MISSIONS, MISSION_COUNT } from '../missions/catalog.mjs';
import { classroomFrame, connectClassroomGame } from '../classroom/game-bridge.mjs';
import { bindAudio, createAudio } from '../audio/sound.mjs';
import { createCenter } from '../missions/center.mjs';
import { createProgress } from '../storage/progress.mjs';
import { bindTeacher } from '../teacher/panel.mjs';
import { mountGame } from './controller.mjs';
import { State } from './engine.mjs';

const get = id => document.getElementById(id);
const frame = classroomFrame();
const storage = frame ? { getItem: () => null, setItem: () => {} } : undefined;
let bridge;
const progress = createProgress(storage, { onSaved: () => {
  if (!frame) get('save-status').textContent = 'Salvato';
  else bridge?.save();
} });
const recoveredPoint = progress.state.checkpoint;
let saveCurrent = () => {};
let restoring = false;
let lastSystems = -1;
const audio = createAudio({
  preferences: progress.state.audio, onChange: preferences => progress.update({ audio: preferences }, true),
});
const syncAudio = bindAudio(audio);
const center = createCenter({ progress, sound: audio.play });
const { game, refresh, tutorial, setLight } = mountGame({
  allowAction: action => bridge?.allow(action) ?? !frame,
  sound: audio.play, nextMission: center.nextStar,
  initialLight: progress.state.light, onLight: light => progress.update({ light }),
  onCheckpoint: checkpoint => {
    if (!restoring && !saveCurrent()) progress.update({ checkpoint });
  },
  missionCount: center.count, missionTotal: center.total,
  onState(game) {
    center.onState(game);
    if (!restoring) saveCurrent();
    const { world } = game;
    if (world.state !== State.VICTORY) return;
    progress.update({ checkpoint: { mode: State.PLAYING, time: world.time, score: world.score, stats: world.stats } });
    const completed = center.completedMissions();
    get('victory-score').textContent = `Punteggio: ${world.score} · Record locale: ${Math.max(world.score, progress.state.best)}`;
    const { rocks, stars, bestCombo } = world.stats;
    get('victory-stats').textContent = `Asteroidi distrutti: ${rocks} · Stelle raccolte: ${stars} · Combo migliore: ${bestCombo}`;
    get('victory-rank').textContent = `Grado di volo: ${rocks >= 12 && bestCombo >= 3 ? 'Esploratore stellare' : rocks >= 5 || bestCombo >= 3 ? 'Pilota d’orbita' : 'Pioniere Aurora'}`;
    const main = center.count();
    get('victory-missions').textContent = `Missioni totali: ${completed.length}/${MISSION_COUNT} · Missioni principali: ${main}/${MAIN_MISSIONS} · Missioni bonus: ${completed.length - main}/${MISSION_COUNT - MAIN_MISSIONS}`;
    get('victory-classroom-next').hidden = !frame || !center.hasIncomplete();
    get('victory-upgrades').textContent = completed.length
      ? `Potenziamenti: ${completed.map(item => item.reward).join(' · ')}`
      : 'Il Centro di controllo resta aperto per provare Python quando vuoi.';
    get('victory-concepts').textContent = completed.length
      ? `Concetti praticati: ${[...new Set(completed.map(item => item.concept.toLocaleLowerCase('it')))].join(', ')}.` : '';
    get('victory-recover').hidden = !center.hasIncomplete();
  },
  onRefresh(game) {
    const { world } = game;
    center.onRefresh(game);
    const count = center.total();
    if (count !== lastSystems) {
      lastSystems = count;
      get('flight-systems').textContent = center.completedMissions().map(mission => mission.reward).join(' · ');
      get('flight-systems-panel').hidden = count === 0;
    }
    bridge?.report();
    if (world.score > progress.state.best) progress.update({ best: world.score });
    get('continue').hidden = !progress.state.checkpoint;
    get('recover-game').hidden = !progress.state.checkpoint;
    const route = get('final-route');
    route.hidden = world.state !== State.PLAYING;
    const label = center.count() === MAIN_MISSIONS ? 'Missioni principali completate. Puoi cercare le stelle bonus prima del boss o continuare dopo lo scontro.'
      : 'Percorso libero · Puoi affrontare la sfida anche con missioni incomplete.';
    if (route.textContent !== label) route.textContent = label;
  },
});
center.bind(game, refresh);
tutorial.bindCenter(center.demo);
if (frame) {
  document.body.classList.add('classroom-game');
  bridge = connectClassroomGame({ game, center, refresh, audio, syncAudio, progress });
} else bindTeacher({ game, refresh, setLight, audio, syncAudio, center, progress });

function restore(point, automatic = false) {
  restoring = true;
  if (game.restore(point)) {
    if (point.mission && !progress.state.completed.includes(point.mission)) game.openMission(point.mission);
    else if (automatic) game.action('pause');
    else get('space').focus({ preventScroll: true });
  }
  restoring = false;
  refresh();
}

for (const id of ['continue', 'recover-game']) {
  get(id).addEventListener('click', () => restore(progress.state.checkpoint));
}

saveCurrent = () => {
  if (restoring) return false;
  const point = game.snapshot();
  if (point) {
    progress.update({ checkpoint: frame ? point : { ...point, resume: true } });
    return true;
  }
  if (!frame && game.world.state === State.MENU && progress.state.checkpoint?.resume) {
    const { resume, ...checkpoint } = progress.state.checkpoint;
    progress.update({ checkpoint });
  }
  progress.flush();
  return false;
};
setInterval(() => saveCurrent(), 5000);
addEventListener('pagehide', () => saveCurrent());
addEventListener('codespace:before-update', () => saveCurrent());
document.addEventListener('visibilitychange', () => { if (document.hidden) saveCurrent(); });
if (!frame) {
  get('export-solo').addEventListener('click', () => {
    saveCurrent();
    downloadFile('code-space-salvataggio.json', JSON.stringify(progress.export(), null, 2));
  });
  get('import-solo').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const value = await readJson(file);
      if (!confirm('Sostituire il salvataggio individuale di questa postazione?')) return;
      progress.import(value);
      restoring = true;
      saveCurrent = () => {};
      location.reload();
    } catch (error) { get('save-feedback').textContent = error.message; }
  });
  if (progress.recovered) get('save-feedback').textContent = 'Ripristinato l’ultimo checkpoint integro.';
  if (recoveredPoint?.resume) restore(recoveredPoint, true);
}
get('victory-recover').addEventListener('click', () => {
  game.action('recover');
  get('space').focus({ preventScroll: true });
  refresh();
});
refresh();
