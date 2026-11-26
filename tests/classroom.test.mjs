import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { demoAdapter } from '../js/classroom/demo.mjs';
import { command, defaults, gate, nickname, pinNumber, ranking, score } from '../js/classroom/model.mjs';
import { sessionService } from '../js/classroom/session.mjs';

test('PIN, pseudonimi e punteggio didattico con pari merito', () => {
  let index = 0;
  assert.equal(pinNumber({ getRandomValues(a) { a[0] = [4294967295, 123][index++]; } }), '000123');
  assert.equal(nickname('  Vega-2 '), 'Vega-2');
  for (const invalid of ['<script>', 'A', 'Nome Cognome', 'merda01']) assert.throws(() => nickname(invalid));
  assert.equal(score({ mask: 31, arcade: 1200, boss: true }), 6000);
  assert.equal(score({ mask: 1, arcade: 0, boss: false }), 1000);
  const rows = ranking({ a: { name: 'Vega' }, b: { name: 'Nova' }, c: { name: 'Luna' } },
    { a: { mask: 2 }, b: { mask: 1 }, c: { arcade: 15 } });
  assert.deepEqual(rows.map(({ rank }) => rank), [1, 1, 3]);
});

test('Comandi versionati, decollo comune, pausa, boss e scadenza', () => {
  const lobby = { phase: 'lobby', seq: 0, at: 100, expires: 9900000, settings: defaults };
  const flight = command(lobby, 'start', 1000);
  assert.equal(flight.at, 6000);
  assert.equal(gate(flight, true, 5999), 'countdown');
  assert.equal(gate(flight, false, 6000), 'offline');
  assert.equal(gate(flight, true, 6000), 'flight');
  assert.throws(() => command(flight, 'start', 7000));
  const boss = command(flight, 'boss', 10000);
  const paused = command(boss, 'pause', 16000);
  assert.equal(gate(paused, true, 36000), 'paused');
  const resumed = command(paused, 'resume', 36000);
  assert.equal(resumed.bossUntil - paused.bossUntil, 20000);
  const returned = command(resumed, 'debrief', resumed.bossUntil);
  assert.equal(returned.phase, 'flight');
  assert.equal(gate(command(returned, 'end', 300000), true, 300001), 'ended');
  assert.equal(gate(flight, true, flight.until), 'ended');
});

test('Demo di protocollo con 50 ammissioni concorrenti, collisioni, riconnessione e isolamento', async t => {
  const shared = new Map();
  const make = role => {
    const identity = new Map();
    const adapter = demoAdapter(role, {
      getStorage: () => ({ getItem: key => shared.get(key), setItem: (key, value) => shared.set(key, value) }),
      tabStorage: () => ({ getItem: key => identity.get(key), setItem: (key, value) => identity.set(key, value) }),
    });
    t.after(adapter.dispose);
    return adapter;
  };
  const host = make('host');
  await host.host();
  const codes = ['123456', '123456', '222222'];
  const hostService = sessionService(host, { randomPin: () => codes.shift() });
  const first = await hostService.create('Classroom', { capacity: 50 });
  const second = await hostService.create('Seconda aula', { capacity: 3 });
  assert.equal(second.data.pin, '222222');
  const players = Array.from({ length: 50 }, () => sessionService(make('student')));
  const enrolled = await Promise.all(players.map((api, index) => api.join(first.data.pin, 'Pilot' + index)));
  const table = await host.get('members/' + first.room);
  assert.equal(Object.keys(table).length, 50);
  assert.equal(new Set(enrolled.map(item => item.member.seat)).size, 50);
  const extra = sessionService(make('student'));
  await assert.rejects(extra.join(first.data.pin, 'PILOT0'), /già utilizzato/);
  await assert.rejects(extra.join(first.data.pin, 'Nuovo'), /piena/);
  assert.deepEqual(await players[0].join(first.data.pin, 'Ignorato'), enrolled[0]);
  const [uid, member] = Object.entries(table).find(([, value]) => value.name === 'Pilot0');
  await hostService.kick(first.room, uid, member);
  await assert.rejects(players[0].join(first.data.pin, 'Ignorato'), /rimosso/);
  await extra.join(second.data.pin, 'Nuovo');
  assert.equal(Object.keys(await host.get('members/' + second.room)).length, 1);
  await hostService.remove(first.room, first.data.pin);
  assert.equal(await host.get('rooms/' + first.room), null);
  assert.equal(await host.get('pins/' + first.data.pin), null);
  assert.ok(await host.get('rooms/' + second.room));
  t.diagnostic('50 ammissioni concorrenti nella demo in Node, non sulla rete Firebase');
});

test('Audit statico delle regole, raccolte isolate e invio privato separato', async () => {
  const { rules } = JSON.parse(await readFile(new URL('../database.rules.json', import.meta.url)));
  assert.equal(rules['.read'], false);
  assert.equal(rules['.write'], false);
  assert.equal(rules.rooms['.read'], undefined);
  assert.equal(rules.pins['.read'], undefined);
  assert.equal(rules.hosts.$uid['.write'], undefined);
  assert.match(rules.rooms.$room['.write'], /hosts.*auth.uid/);
  assert.match(rules.scores.$room.$uid['.write'], /auth.uid === \$uid.*kicked.*updated/);
  assert.match(rules.metrics.$room['.read'], /owner.*auth.uid/);
  assert.equal(rules.metrics.$room.$uid.$other['.validate'], false);
  assert.match(rules.viewAccess.$room.$uid['.write'], /projectors.*val/);
  assert.match(rules.scores.$room['.read'], /viewAccess/);
  assert.doesNotMatch(rules.metrics.$room['.read'], /viewAccess/);
});
