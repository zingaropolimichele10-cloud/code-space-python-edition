import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { applyHelp, changeHelp } from '../js/classroom/help.mjs';

const first = { id: '11111111-1111-4111-8111-111111111111', status: 'open' };
const second = { id: '22222222-2222-4222-8222-222222222222', status: 'open' };
const resolved = request => ({ ...request, status: 'resolved' });
const cancelled = request => ({ ...request, status: 'cancelled' });

test('L’ACK ritardato o riprodotto dopo un refresh non riapre la richiesta', async () => {
  let remote = null;
  const store = {
    get: async () => remote,
    transaction: async (_, update) => {
      const next = update(remote);
      if (!next) return false;
      remote = next;
      return true;
    },
  };
  const path = 'helpRequests/room/student';
  const request = { previous: null, next: first };
  assert.equal((await applyHelp(store, path, request)).committed, true);
  assert.equal((await applyHelp(store, path, { previous: first, next: resolved(first) })).committed, true);
  assert.deepEqual(await applyHelp(store, path, request), { committed: false, current: resolved(first) });
  assert.equal((await applyHelp(store, path, { previous: resolved(first), next: second })).committed, true);
  assert.equal((await applyHelp(store, path, { previous: first, next: resolved(first) })).committed, false);
  assert.equal(changeHelp(second, { previous: first, next: cancelled(first) }), undefined);
  assert.equal((await applyHelp(store, path, { previous: second, next: cancelled(second) })).committed, true);
  assert.equal(changeHelp(cancelled(second), { previous: cancelled(second), next: second }), undefined);
});

test('Una richiesta in coda durante il guasto si sincronizza una volta al ritorno della connessione', async () => {
  let online = false;
  let remote = null;
  let loseAcknowledgement = false;
  const store = {
    get: async () => {
      if (!online) throw Error('offline');
      return remote;
    },
    transaction: async (_, change) => {
      const next = change(remote);
      if (!next) return false;
      remote = next;
      if (loseAcknowledgement) { online = false; throw Error('ACK assente'); }
      return true;
    },
  };
  const path = 'helpRequests/room/student';
  const pending = JSON.stringify({ previous: null, next: first });
  await assert.rejects(() => applyHelp(store, path, JSON.parse(pending)), /offline/);
  online = true;
  loseAcknowledgement = true;
  await assert.rejects(() => applyHelp(store, path, JSON.parse(pending)), /ACK assente/);
  assert.deepEqual(remote, first);
  online = true;
  loseAcknowledgement = false;
  await applyHelp(store, path, { previous: first, next: resolved(first) });
  assert.deepEqual(await applyHelp(store, path, JSON.parse(pending)), { committed: false, current: resolved(first) });
});

test('Regole 2.3.1 conservate; i nuovi permessi sono confinati alle richieste e alle impostazioni', () => {
  const previous = JSON.parse(execFileSync('git', ['show', '8a42325:database.rules.json']));
  const candidate = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url)));
  const node = candidate.rules.helpRequests.$room;
  assert.match(node['.read'], /hosts.*owner.*expires/);
  assert.match(node.$uid['.read'], /auth.uid === \$uid.*members.*kicked.*expires/);
  assert.match(node.$uid['.write'], /status.*open.*id.*cancelled.*hosts.*owner.*resolved/);
  assert.equal(node.$uid.$other['.validate'], false);
  delete candidate.rules.helpRequests;
  const settings = candidate.rules.rooms.$room.settings;
  for (const key of ['missionLimit', 'missionInterval', 'missionAuto', 'missionSignal']) delete settings[key];
  settings['.validate'] = previous.rules.rooms.$room.settings['.validate'];
  assert.deepEqual(candidate, previous);
});
