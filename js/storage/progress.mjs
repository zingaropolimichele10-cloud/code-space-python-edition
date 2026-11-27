import { limits } from '../python/protocol.mjs';

export const saveKey = 'code-space:missioni-1.1:progress:v3';
const legacySaveKey = 'code-space:progress:v2';
const legacyKey = 'code-space:missioni:v1';
const legacyAudio = 'code-space:audio:v1';
const ids = [1, 2, 3, 4];
const validIds = values => ids.filter(id => Array.isArray(values) && values.includes(id));
const validScore = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
const validVolume = value => Number.isFinite(value) && value >= 0 && value <= 1;

export function normalizeProgress(input) {
  const legacy = input?.version === 2 ? input : null;
  const raw = legacy ? { ...legacy,
    completed: validIds(legacy.completed).filter(id => id !== 2),
    skipped: validIds(legacy.skipped).filter(id => id !== 2),
    drafts: { ...legacy.drafts, 2: undefined },
    legacyLives: Array.isArray(legacy.completed) && legacy.completed.includes(2),
    legacyShield: Array.isArray(legacy.completed) && legacy.completed.includes(5),
    legacyDrafts: { 2: legacy.drafts?.[2], 5: legacy.drafts?.[5] },
  } : input?.version === 3 ? input : {};
  const completed = validIds(raw.completed);
  const point = raw.checkpoint;
  return {
    version: 3,
    completed,
    paint: ['blu', 'verde', 'viola'].includes(raw.paint) ? raw.paint : 'blu',
    legacyLives: raw.legacyLives === true,
    legacyShield: raw.legacyShield === true,
    legacyDrafts: Object.fromEntries([2, 5].filter(id => typeof raw.legacyDrafts?.[id] === 'string')
      .map(id => [id, raw.legacyDrafts[id].slice(0, limits.source)])),
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
  const state = normalizeProgress(saved === undefined ? read(legacySaveKey) ?? {
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
