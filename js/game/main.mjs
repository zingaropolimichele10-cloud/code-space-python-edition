import { createCenter } from '../missions/center.mjs';
import { mountGame } from './controller.mjs';

const center = createCenter();
const { game, refresh } = mountGame({
  nextMission: center.nextStar, finalReady: () => center.count() === 4,
  onState: center.onState, missionCount: center.count, onRefresh: center.onRefresh,
});
center.bind(game, refresh);
refresh();
