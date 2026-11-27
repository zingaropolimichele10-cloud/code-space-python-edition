import { missionPolicy } from '../missions/policy.mjs';
import { MISSION_COUNT } from '../missions/catalog.mjs';
import { limits } from '../python/protocol.mjs';

export const saveKey = 'code-space:progress:v3';
const previousKey = 'code-space:progress:v2';
const legacyKey = 'code-space:missioni:v1';
const legacyAudio = 'code-space:audio:v1';
const ids = Array.from({ length: MISSION_COUNT }, (_, index) => index + 1);
const validIds = values => ids.filter(id => Array.isArray(values) && values.includes(id));
export const backupKeys = Array.from({ length: 3 }, (_, index) => saveKey + ':backup:' + index);
const hash = value => {
  let sum = 2166136261;
  for (let i = 0; i < value.length; i++) sum = Math.imul(sum ^ value.charCodeAt(i), 16777619);
  return (sum >>> 0).toString(16);
};
const validScore = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
const validPoint = point => point && ['PLAYING', 'FINAL_CHALLENGE'].includes(point.mode) &&
  validScore(point.score) && Number.isFinite(point.time) && point.time >= 0 && point.time <= 86_400;
function isSaved(input) {
  if (![2, 3].includes(input?.version) || !Array.isArray(input.completed) ||
      (input.drafts != null && (typeof input.drafts !== 'object' || Array.isArray(input.drafts))) ||
      (input.checkpoint != null && !validPoint(input.checkpoint))) return false;
  const { integrity, ...payload } = input;
  return integrity === undefined || integrity === hash(JSON.stringify(payload));
}
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
    color: ['blu', 'verde', 'viola'].includes(raw.color)
      ? raw.color : 'blu',
    best: validScore(raw.best) ? raw.best : 0,
    audio: { enabled: raw.audio?.enabled === true, volume: validVolume(raw.audio?.volume) ? raw.audio.volume : .25 },
    light: raw.light === true,
    ...(raw.missionOptions ? { missionOptions: missionPolicy(raw.missionOptions) } : {}),
    checkpoint: validPoint(point)
      ? {
        mode: point.mode, score: point.score, time: point.time,
        ...(Number.isInteger(point.lives) && point.lives >= 1 && point.lives <= 5 ? { lives: point.lives } : {}),
        ...(point.shield === true || point.shield === false ? { shield: point.shield } : {}),
        ...(point.emergency === true || point.emergency === false ? { emergency: point.emergency } : {}),
        ...(Number.isInteger(point.sector) && point.sector >= 0 && point.sector <= 4 ? { sector: point.sector } : {}),
        ...(Number.isInteger(point.mission) && point.mission >= 1 && point.mission <= MISSION_COUNT && point.mode === 'PLAYING'
          ? { mission: point.mission } : {}),
        ...(point.resume === true ? { resume: true } : {}),
        ...(point.mode === 'FINAL_CHALLENGE' && Number.isFinite(point.left) && point.left > 0 && point.left <= 180 ? { left: point.left } : {}),
        ...(point.mode === 'FINAL_CHALLENGE' && Number.isInteger(point.bossHP) && point.bossHP > 0 && point.bossHP <= 100 ? { bossHP: point.bossHP } : {}),
        ...(point.stats && ['rocks', 'stars', 'bestCombo'].every(key => validScore(point.stats[key]))
          ? { stats: { rocks: point.stats.rocks, stars: point.stats.stars, bestCombo: point.stats.bestCombo } } : {}),
        ...(point.mode === 'FINAL_CHALLENGE' && Number.isInteger(point.duration) && point.duration >= 10 && point.duration <= 180
          ? { duration: point.duration } : {}),
      } : null,
  };
}

export function createProgress(storage, { onSaved = () => {} } = {}) {
  function read(key) {
    try {
      const value = (storage ?? globalThis.localStorage).getItem(key);
      if (value === null) return undefined;
      return JSON.parse(value);
    } catch { return null; }
  }
  const saved = read(saveKey);
  const backups = backupKeys.map(read).filter(entry => entry?.schema === 1 && Number.isSafeInteger(entry.serial) &&
    isSaved(entry.data) && entry.checksum === hash(JSON.stringify(entry.data)))
    .sort((a, b) => b.serial - a.serial);
  const previous = saved === undefined ? read(previousKey) : undefined;
  const recovered = saved !== undefined && !isSaved(saved) && backups.length > 0;
  const state = normalizeProgress(isSaved(saved) ? saved : backups[0]?.data ?? previous ?? (saved === undefined ? {
    version: 2, completed: read(legacyKey), audio: read(legacyAudio),
  } : null));
  let serial = backups[0]?.serial ?? 0;
  let lastWrite;
  let timer;
  let dirty = false;
  function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (!dirty) return;
    dirty = false;
    const data = JSON.stringify(state);
    if (data === lastWrite) return;
    try {
      const target = storage ?? globalThis.localStorage;
      const entry = { schema: 1, serial: ++serial, savedAt: Date.now(), checksum: hash(data), data: state };
      target.setItem(backupKeys[(serial - 1) % backupKeys.length], JSON.stringify(entry));
      target.setItem(saveKey, JSON.stringify({ ...state, integrity: entry.checksum }));
      lastWrite = data;
      onSaved();
    } catch { /* Memoria locale alla pagina. */ }
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
    for (const key of backupKeys) {
      try { (storage ?? globalThis.localStorage).removeItem?.(key); } catch { /* Storage indisponibile. */ }
    }
    serial = 0;
    lastWrite = undefined;
    update({ ...normalizeProgress(null), audio: state.audio, light: state.light, missionOptions: state.missionOptions });
  }
  globalThis.addEventListener?.('pagehide', flush);
  globalThis.addEventListener?.('codespace:before-update', flush);
  if (recovered) {
    dirty = true;
    flush();
  }
  return { state, update, reset, flush, recovered,
    export: () => ({ schema: 1, kind: 'code-space-solo', progress: state }),
    import(value) {
      if (value?.schema !== 1 || value.kind !== 'code-space-solo' || !isSaved(value.progress)) throw Error('Salvataggio individuale non valido.');
      reset();
      update(normalizeProgress(value.progress));
    },
  };
}
