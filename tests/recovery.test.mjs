import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupKeys, createProgress, saveKey } from '../js/storage/progress.mjs';
import { archiveCsv, importArchive, mergeReports, privateReportFields, studentRecovery } from '../js/classroom/recovery.mjs';
import { sessionService } from '../js/classroom/session.mjs';
import { demoAdapter } from '../js/classroom/demo.mjs';

function memory() {
  const values = new Map();
  return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k, v), removeItem: k => values.delete(k) };
}

test('Tre checkpoint versionati: recupero dell’ultimo backup integro e importazione individuale', () => {
  const storage = memory();
  const progress = createProgress(storage);
  for (const score of [10,20,30,40]) progress.update({ checkpoint: { mode: 'PLAYING', score, time: score, lives: 2 }, best: score });
  assert.equal(backupKeys.filter(k => storage.getItem(k)).length, 3);
  const newest = backupKeys.find(k => JSON.parse(storage.getItem(k)).serial === 4);
  const changed = JSON.parse(storage.getItem(newest));
  changed.data.checkpoint.score = 9999;
  storage.setItem(newest, JSON.stringify(changed));
  storage.setItem(saveKey, '{rotto');
  const recovered = createProgress(storage);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.state.checkpoint.score, 30);
  assert.equal(recovered.state.checkpoint.lives, 2);
  const other = createProgress(memory());
  other.import(recovered.export());
  assert.deepEqual(other.state, recovered.state);
  assert.throws(() => other.import({schema: 1, kind: 'code-space-classroom'}), /non valido/);
});

test('Coda Classroom idempotente e senza credenziali nell’archivio', () => {
  const old = { mask: 1, arcade: 90, boss: false };
  const next = { mask: 4, arcade: 120, boss: true };
  const first = mergeReports(old,next,'flight');
  assert.deepEqual(first,{ mask: 5, arcade: 120, boss: false });
  assert.deepEqual(mergeReports(first,next,'flight'),first);
  assert.equal(privateReportFields({attempts: 2, errors: 55}).errors, 2);
  assert.deepEqual(studentRecovery({ completed: [1,5,12], token: 'x', drafts: { 1: 'velocita=5' } }).drafts, { 1: 'velocita=5' });
  const room = 'a'.repeat(36);
  const sessions = importArchive({ schema: 1, kind: 'code-space-classroom', sessions: [{
    room, pin: '123456', title: '=COMANDO', token: 'x', credentials: 'x',
    results: [{name: 'Aurora', rank: 1, points: 1400, uid: 'x', errors: 100}],
  }]});
  assert.equal(sessions[0].token, undefined);
  assert.equal(sessions[0].results[0].uid, undefined);
  assert.match(archiveCsv(sessions), /"'=COMANDO"/);
});

test('Tre gruppi sugli stessi profili: PIN diversi, punteggi e membri isolati', async () => {
  const database = memory();
  const hostStorage = memory();
  const studentStorage = memory();
  const host = demoAdapter('host', { getStorage: () => database, tabStorage: () => hostStorage });
  const student = demoAdapter('student', { getStorage: () => database, tabStorage: () => studentStorage });
  try {
    await host.host();
    const api = sessionService(host);
    const pins = new Set();
    const rooms = [];
    for (let group = 1; group <= 3; group++) {
      const {room,data} = await api.create('Gruppo ' + group);
      rooms.push(room);
      pins.add(data.pin);
      assert.equal(await host.get('scores/' + room), null);
      const studentApi = sessionService(student);
      const joined = await studentApi.join(data.pin, 'Aurora');
      assert.equal(joined.room, room);
      await api.command(room,'start');
      await student.set(`scores/${room}/${student.uid}`, { mask: group });
      await api.command(room,'end');
    }
    assert.equal(pins.size, 3);
    for (const [index, room] of rooms.entries()) {
      assert.equal((await host.get('rooms/' + room)).phase, 'ended');
      assert.equal((await host.get(`scores/${room}/${student.uid}`)).mask, index + 1);
    }
  } finally { host.dispose(); student.dispose(); }
});
