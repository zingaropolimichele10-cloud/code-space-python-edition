import { missionPolicy } from '../missions/policy.mjs';
import { studentRecovery } from './recovery.mjs';
import { State } from '../game/engine.mjs';

const playerStates = {
  MENU: 'waiting', TUTORIAL: 'waiting', PLAYING: 'flying', PAUSED: 'paused',
  MISSION: 'python', GAME_OVER: 'gameover', FINAL_CHALLENGE: 'boss', VICTORY: 'finished',
};

export function classroomFrame() {
  return parent !== window && new URLSearchParams(location.search).get('classroom') === '1';
}

export function connectClassroomGame({ game, center, refresh, audio, syncAudio, progress }) {
  const { world } = game;
  let room;
  let seq = -1;
  let missionSignal;
  let gate = 'offline';
  let bossEntered = false;
  let bossWon = false;
  let previous;
  let previousMilestone;
  let lastTime = 0;
  let lastAudio;
  let expiry = 0;
  const send = data => parent.postMessage(data, location.origin);
  const resume = document.querySelector('#paused-panel [data-action=resume]');
  const flying = () => ['flight', 'boss'].includes(gate);

  function stop() {
    gate = 'offline';
    game.action('pause');
    game.keys.clear();
    center.classroomPolicy(game, { blocked: true, skip: false, mask: 0 });
    resume.disabled = true;
    refresh();
  }

  function syncBoss(left) {
    if (gate !== 'boss' || world.state !== State.FINAL_CHALLENGE || !Number.isFinite(left)) return;
    world.finalLeft = Math.max(0, left / 1000);
    if (left <= 0 && game.finishFinal()) refresh();
  }

  function launch(data) {
    room = data.room;
    seq = data.seq;
    const old = gate;
    gate = data.state;
    expiry = performance.now() + 2400;
    const { settings } = data;
    const enabled = settings.audio === true;
    if (enabled !== lastAudio) {
      audio.configure(!enabled, audio.volume);
      syncAudio();
      lastAudio = enabled;
    }
    const duration = gate === 'boss' ? Math.max(1, Math.min(180, data.bossSeconds)) : settings.bossSeconds;
    game.configure({ ...missionPolicy(settings), difficulty: settings.difficulty, asteroids: settings.rocks, duration });
    const skip = settings.skip || center.completedMissions().length >= settings.required;
    center.classroomPolicy(game, { blocked: !flying(), skip, mask: data.completed });
    bossWon ||= data.bossWon === true;
    resume.disabled = !flying();
    if (!flying()) {
      game.action('pause');
      game.keys.clear();
      if (['ended', 'kicked', 'expired'].includes(gate)) center.interrupt();
    } else {
      if (world.state === State.MENU) {
        const recovery = studentRecovery(data.recovery);
        center.recoverDrafts(recovery);
        const point = recovery.checkpoint;
        const resumeBoss = gate === 'boss' && !bossWon && point?.mode === State.FINAL_CHALLENGE && data.bossLeft > 0;
        if (point && (gate === 'flight' || resumeBoss)) {
          game.restore({ ...point, mode: resumeBoss ? State.FINAL_CHALLENGE : State.PLAYING,
            score: data.arcade, ...(resumeBoss ? { duration: settings.bossSeconds, left: data.bossLeft / 1000 } : {}) });
          bossEntered ||= resumeBoss;
          if (gate === 'flight' && point.mission && !center.completedMissions().some(mission => mission.id === point.mission)) {
            game.openMission(point.mission);
          }
        } else {
          game.action('start');
          world.score = Math.max(0, data.arcade);
        }
      }
      if (gate === 'boss' && !bossEntered && data.bossSeconds > 0 && !bossWon) {
        center.interrupt();
        if (world.state === State.GAME_OVER) game.action('checkpoint');
        if (world.state === State.PAUSED) game.action('resume');
        if (world.state === State.VICTORY) game.action('recover');
        bossEntered = game.action('final');
      } else if (gate === 'flight' && bossEntered && old !== 'flight') {
        if (world.state === State.PAUSED) game.action('resume');
        if (world.state === State.FINAL_CHALLENGE) game.action('pause');
        if (world.state === State.GAME_OVER) {
          game.action('checkpoint');
          game.action('pause');
        }
        if ([State.PAUSED, State.VICTORY].includes(world.state)) game.action('recover');
        bossEntered = false;
      } else if (!['flight', 'boss'].includes(old) && world.state === State.PAUSED) game.action('resume');
    }
    const signal = settings.missionSignal ?? 0;
    if (missionSignal !== undefined && signal > missionSignal && !['ended', 'expired', 'kicked'].includes(gate)) {
      game.requestMissionStar();
    }
    missionSignal = signal;
    syncBoss(data.bossLeft);
    refresh();
  }

  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    const data = event.data;
    if (data?.type === 'cs:heartbeat' && data.room === room && data.seq === seq) {
      expiry = performance.now() + 2400;
      syncBoss(data.bossLeft);
      return;
    }
    if (data?.type !== 'cs:policy' || (room && room !== data.room) || data.seq < seq || !data.settings) return;
    launch(data);
  });
  setInterval(() => {
    if (flying() && performance.now() > expiry) stop();
  }, 250);
  send({ type: 'cs:ready' });
  return {
    save() {
      if (room) send({ type: 'cs:save', room, recovery: studentRecovery(progress.state) });
    },
    allow: action => flying() && ['pause', 'resume', 'checkpoint'].includes(action),
    report() {
      if (!room || !flying()) return;
      bossWon ||= bossEntered && world.state === State.VICTORY;
      const mask = center.completedMissions().reduce((bits, mission) => bits | (1 << (mission.id - 1)), 0);
      const data = { type: 'cs:report', room, arcade: Math.min(1000, world.score), mask,
        boss: bossWon, lives: world.lives, sector: world.sector, status: playerStates[world.state], ...center.observe() };
      const snapshot = JSON.stringify(data);
      const now = performance.now();
      const milestone = [data.mask, data.boss, data.status].join('/');
      if (snapshot !== previous && (milestone !== previousMilestone || now - lastTime >= 160)) {
        previousMilestone = milestone;
        previous = snapshot;
        lastTime = now;
        send(data);
      }
    },
  };
}
