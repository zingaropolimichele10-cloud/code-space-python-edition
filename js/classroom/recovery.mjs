import { MISSION_COUNT, MISSION_MASK } from '../missions/catalog.mjs';
import { normalizeProgress } from '../storage/progress.mjs';

export function localValue(key, storage = globalThis.localStorage) {
  try { return JSON.parse(storage.getItem(key)); } catch { return null; }
}
export function saveLocal(key, value, storage = globalThis.localStorage) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

const bounded = (value, max) => Number.isSafeInteger(value) ? Math.max(0, Math.min(value, max)) : 0;

export function studentRecovery(value) {
  const data = normalizeProgress({ version: 3, drafts: value?.drafts, skipped: value?.skipped, checkpoint: value?.checkpoint });
  return { drafts: data.drafts, checkpoint: data.checkpoint, skipped: data.skipped };
}

export function mergeReports(queued, incoming, phase) {
  const data = {
    mask: bounded(queued?.mask, MISSION_MASK) | bounded(incoming?.mask, MISSION_MASK),
    arcade: Math.max(bounded(queued?.arcade, 1000), bounded(incoming?.arcade, 1000)),
    boss: phase === 'boss' && (queued?.boss === true || incoming?.boss === true),
  };
  return { ...incoming, ...data };
}

export function privateReportFields(report) {
  const attempts = bounded(report?.attempts, 2000);
  return {
    mission: bounded(report?.mission, MISSION_COUNT), attempts,
    errors: bounded(report?.errors, attempts), hints: bounded(report?.hints, 3),
    since: bounded(report?.since, 9999999999999), help: report?.help === true,
  };
}

const roomId = value => typeof value === 'string' && /^[a-z0-9-]{36}$/.test(value);
const clean = (value, max) => typeof value === 'string' ? value.slice(0, max).replace(/[\u0000-\u001f]/g, '') : '';
export function archiveEntry(value) {
  if (!roomId(value?.room) || !/^\d{6}$/.test(value.pin) || !Array.isArray(value.results)) throw Error('Sessione non valida.');
  return {
    room: value.room, pin: value.pin, title: clean(value.title, 60), group: bounded(value.group, 3),
    ended: value.ended === true, savedAt: bounded(value.savedAt, 9999999999999),
    phase: ['lobby', 'flight', 'boss', 'paused', 'ended'].includes(value.phase) ? value.phase : 'ended',
    expires: bounded(value.expires, 9999999999999),
    timing: Object.fromEntries(['at','until','bossUntil','remaining','bossRemaining','seq']
      .map(field => [field, bounded(value.timing?.[field], 9999999999999)])),
    settings: { duration: bounded(value.settings?.duration, 90), capacity: bounded(value.settings?.capacity, 50),
      bossSeconds: bounded(value.settings?.bossSeconds, 180), required: bounded(value.settings?.required, MISSION_COUNT),
      difficulty: ['calm', 'standard', 'hard'].includes(value.settings?.difficulty) ? value.settings.difficulty : 'standard',
      audio: value.settings?.audio === true, skip: value.settings?.skip === true,
      late: value.settings?.late === true, rocks: value.settings?.rocks === true },
    results: value.results.slice(0, 50).map(row => ({
      name: clean(row?.name, 16), rank: bounded(row?.rank, 50), points: bounded(row?.points, 100000),
      missions: bounded(row?.missions, MISSION_COUNT), boss: row?.boss === true,
    })).filter(row => row.name),
  };
}

export function importArchive(value) {
  if (value?.schema !== 1 || value.kind !== 'code-space-classroom' || !Array.isArray(value.sessions) || value.sessions.length > 50) {
    throw Error('Backup Classroom non valido.');
  }
  return value.sessions.map(archiveEntry);
}

export function archiveCsv(entries) {
  const cell = value => {
    const text = String(value);
    return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
  };
  return '\ufeff' + [
    ['Gruppo', 'Sessione', 'Posizione', 'Nickname', 'Punti', 'Missioni', 'Boss'].join(';'),
    ...entries.flatMap(entry => entry.results.map(row =>
      [entry.group || '', entry.title, row.rank, row.name, row.points, row.missions, row.boss ? 'Sì' : 'No'].map(cell).join(';'))),
  ].join('\r\n');
}
