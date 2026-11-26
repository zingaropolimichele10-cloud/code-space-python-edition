import { MISSION_COUNT } from '../missions/catalog.mjs';
import { limits } from '../python/protocol.mjs';

export const saveKey = 'code-space:progress:v3';
const previousKey = 'code-space:progress:v2';
const legacyKey = 'code-space:missioni:v1';
const legacyAudio = 'code-space:audio:v1';
const ids = Array.from({ length: MISSION_COUNT }, (_, index) => index + 1);
const validIds = values => ids.filter(id => Array.isArray(values) && values.includes(id));
const validScore = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
const validVolume = value => Number.isFinite(value) && value >= 0 && value <= 1;

export function normalizeProgress(input) {
  const legacyIds = values => Array.isArray(values) ? values.filter(id => [1, 2, 3, 4, 5].includes(id))
    .map(id => id === 5 ? 7 : id) : [];
  const { drafts } = input ?? {};
  const raw = input?.version === 3 ? input : input?.version === 2 ? {
    ...input, completed: legacyIds(input.completed), skipped: legacyIds(input.skipped),
    drafts: { 1: drafts?.[1], 3: drafts?.[3], 7: drafts?.[5] === 'scudo = False\nif vite < 3:\n    pass' ? undefined : drafts?.[5] },
  } : {};
  const completed = validIds(raw.completed);
  const point = raw.checkpoint;
  return {
    version: 3,
    completed,
    skipped: validIds(raw.skipped).filter(id => !completed.includes(id)),
    drafts: Object.fromEntries(ids.filter(id => typeof raw.drafts?.[id] === 'string')
      .map(id => [id, raw.drafts[id].slice(0, limits.source)])),
    upgrades: [...completed],
    best: validScore(raw.best) ? raw.best : 0,
    audio: { enabled: raw.audio?.enabled === true, volume: validVolume(raw.audio?.volume) ? raw.audio.volume : .25 },
    light: raw.light === true,
    checkpoint: point && ['PLAYING', 'FINAL_CHALLENGE'].includes(point.mode)
      && validScore(point.score) && Number.isFinite(point.time) && point.time >= 0 && point.time <= 86_400
      ? {
        mode: point.mode, score: point.score, time: point.time,
        ...(point.stats && ['rocks', 'stars', 'bestCombo'].every(key => validScore(point.stats[key]))
          ? { stats: { rocks: point.stats.rocks, stars: point.stats.stars, bestCombo: point.stats.bestCombo } } : {}),
        ...(point.mode === 'FINAL_CHALLENGE' && Number.isInteger(point.duration) && point.duration >= 10 && point.duration <= 180
          ? { duration: point.duration } : {}),
      } : null,
  };
}

export function createProgress(storage) {
  function read(key) {
    try {
      const value = (storage ?? globalThis.localStorage).getItem(key);
      if (value === null) return undefined;
      return JSON.parse(value);
    } catch { return null; }
  }
  const saved = read(saveKey);
  const previous = saved === undefined ? read(previousKey) : undefined;
  const state = normalizeProgress(saved === undefined ? previous ?? {
    version: 2, completed: read(legacyKey), audio: read(legacyAudio),
  } : saved);
  let timer;
  let dirty = false;
  function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (!dirty) return;
    dirty = false;
    try { (storage ?? globalThis.localStorage).setItem(saveKey, JSON.stringify(state)); } catch { /* Memoria locale alla pagina. */ }
  }
  function update(patch, defer = false) {
    dirty = true;
    Object.assign(state, normalizeProgress({ ...state, ...patch }));
    if (defer) {
      clearTimeout(timer);
      timer = setTimeout(flush, 250);
    } else flush();
  }
  function reset() {
    update({ ...normalizeProgress(null), audio: state.audio, light: state.light });
  }
  globalThis.addEventListener?.('pagehide', flush);
  return { state, update, reset, flush };
}
