import { bindAudio, createAudio } from '../audio/sound.mjs';
import { createCenter } from '../missions/center.mjs';
import { createProgress } from '../storage/progress.mjs';
import { bindTeacher } from '../teacher/panel.mjs';
import { mountGame } from './controller.mjs';
import { State } from './engine.mjs';

const get = id => document.getElementById(id);
const progress = createProgress();
const audio = createAudio({
  preferences: progress.state.audio, onChange: preferences => progress.update({ audio: preferences }, true),
});
const syncAudio = bindAudio(audio);
const center = createCenter({ progress, sound: audio.play });
const { game, refresh, tutorial, setLight } = mountGame({
  sound: audio.play, nextMission: center.nextStar,
  initialLight: progress.state.light, onLight: light => progress.update({ light }),
  onCheckpoint: checkpoint => progress.update({ checkpoint }),
  missionCount: center.count,
  onState(game) {
    center.onState(game);
    const { world } = game;
    if (world.state !== State.VICTORY) return;
    progress.update({ checkpoint: { mode: State.PLAYING, time: world.time, score: world.score } });
    const completed = center.completedMissions();
    get('victory-score').textContent = `Punteggio: ${world.score} · Record locale: ${progress.state.best}`;
    get('victory-missions').textContent = `Missioni principali: ${center.count()} su 4${completed.some(item => item.optional) ? ' · Missione facoltativa completata' : ''}`;
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
    if (world.score > progress.state.best) progress.update({ best: world.score });
    get('continue').hidden = !progress.state.checkpoint;
    const route = get('final-route');
    route.hidden = world.state !== State.PLAYING;
    const label = center.count() === 4 ? 'Percorso completo · Potenziamenti principali a bordo.'
      : 'Percorso libero · Puoi affrontare la sfida anche con missioni incomplete.';
    if (route.textContent !== label) route.textContent = label;
  },
});
center.bind(game, refresh);
tutorial.bindCenter(center.demo);
bindTeacher({ game, refresh, setLight, audio, syncAudio, center, progress });

get('continue').addEventListener('click', () => {
  game.restore(progress.state.checkpoint);
  refresh();
});
get('victory-recover').addEventListener('click', () => {
  game.action('recover');
  const id = progress.state.skipped[0];
  if (id) game.openMission(id);
  refresh();
});
refresh();
