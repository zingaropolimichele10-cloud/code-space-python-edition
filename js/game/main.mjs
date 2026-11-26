import { bindAudio, createAudio } from '../audio/sound.mjs';
import { createCenter } from '../missions/center.mjs';
import { mountGame } from './controller.mjs';

const audio = createAudio();
bindAudio(audio);
const center = createCenter({ sound: audio.play });
const { game, refresh, tutorial } = mountGame({
  sound: audio.play, nextMission: center.nextStar, finalReady: () => center.count() === 4,
  onState: center.onState, missionCount: center.count, onRefresh: center.onRefresh,
});
center.bind(game, refresh);
tutorial.bindCenter(center.demo);
refresh();
