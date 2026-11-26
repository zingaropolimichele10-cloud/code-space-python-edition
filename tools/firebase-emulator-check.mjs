import assert from 'node:assert/strict';

const authOrigin = 'http://127.0.0.1:9099';
const databaseOrigin = 'http://127.0.0.1:9000';
const ns = 'demo-codespace-default-rtdb';
const root = authOrigin + '/identitytoolkit.googleapis.com/v1/accounts:';

async function auth(action, data) {
  const response = await fetch(root + action + '?key=demo-codespace', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, returnSecureToken: true }),
  });
  if (!response.ok) throw Error('Emulatore Auth: HTTP ' + response.status);
  return response.json();
}

const email = 'host-' + crypto.randomUUID() + '@example.test';
const password = crypto.randomUUID();
const created = await auth('signUp', { email, password });
const host = await auth('signInWithPassword', { email, password });
const student = await auth('signUp', {});
const other = await auth('signUp', {});
assert.equal(created.localId, host.localId);
assert.notEqual(student.localId, other.localId);
const provider = user => JSON.parse(Buffer.from(user.idToken.split('.')[1], 'base64url')).firebase.sign_in_provider;
assert.equal(provider(host), 'password');
assert.equal(provider(student), 'anonymous');
console.log('Auth Emulator: accesso Host con credenziali di prova e due autenticazioni anonime distinte.');

if (!process.argv.includes('--auth-only')) {
  async function db(path, identity, method = 'GET', data, allowed = true) {
    const url = new URL(databaseOrigin + '/' + path + '.json');
    url.searchParams.set('ns', ns);
    const headers = { 'content-type': 'application/json' };
    if (identity === 'admin') headers.authorization = 'Bearer owner';
    else if (identity) url.searchParams.set('auth', identity.idToken);
    const res = await fetch(url, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) });
    assert.equal(res.ok, allowed, path + ' HTTP ' + res.status);
    const payload = await res.json();
    if (!allowed) assert.match(payload.error ?? '', /permission denied/i, path);
    return payload;
  }
  const now = Date.now();
  const room = crypto.randomUUID();
  const pin = String(100000 + Math.floor(Math.random() * 900000));
  const ticket = { owner: host.localId, room, expires: now + 600000, capacity: 30 };
  const control = { owner: host.localId, pin, title: 'Prova locale', created: now, expires: ticket.expires,
    phase: 'lobby', seq: 0, at: now, until: 0, locked: false, view: 'lobby', reveal: 0,
    settings: { capacity: 30, minutes: 40, difficulty: 'standard', bossSeconds: 60, required: 4,
      audio: false, skip: true, late: true, rocks: true } };
  await db('pins', student, 'GET', undefined, false);
  await db('hosts/' + student.localId, student, 'PUT', true, false);
  await db('pins/' + pin, host, 'PUT', ticket, false);
  await db('rooms/' + room, host, 'PUT', control, false);
  await db('hosts/' + host.localId, host, 'PUT', true, false);
  await db('hosts/' + host.localId, 'admin', 'PUT', true);
  await db('pins/' + pin, host, 'PUT', ticket);
  await db('rooms/' + room, host, 'PUT', control);
  await db('rooms/' + room, student, 'GET', undefined, false);
  await db('members/' + room, student, 'GET', undefined, false);
  await db('rooms/' + room + '/locked', student, 'PUT', true, false);
  const otherEmail = 'host-second-' + crypto.randomUUID() + '@example.test';
  const unlisted = await auth('signUp', { email: otherEmail, password: crypto.randomUUID() });
  await db('rooms/' + room + '/locked', unlisted, 'PUT', true, false);
  await db('hosts/' + unlisted.localId, 'admin', 'PUT', true);
  await db('rooms/' + room + '/locked', unlisted, 'PUT', true, false);
  await db('rooms/' + room, null, 'PUT', control, false);
  await db('seats/' + room + '/0', student, 'PUT', student.localId, false);
  await db('names/' + room + '/vega', student, 'PUT', student.localId, false);
  const membership = 'members/' + room + '/' + student.localId;
  const admission = (seat, key = 'vega', code = pin) => ({
    [membership]: { name: key, key, seat, kicked: false, pin: code },
    ['seats/' + room + '/' + seat]: student.localId,
    ['names/' + room + '/' + key]: student.localId,
  });
  await db('', student, 'PATCH', admission(30), false);
  const wrongPin = pin === '100000' ? '100001' : '100000';
  await db('', student, 'PATCH', admission(0, 'vega', wrongPin), false);
  await db('', student, 'PATCH', { ...admission(0), ['seats/' + room + '/1']: student.localId }, false);
  await db('', student, 'PATCH', { ...admission(0), ['names/' + room + '/nova']: student.localId }, false);
  await db('', student, 'PATCH', admission(0));
  await db('rooms/' + room, student, 'GET');
  await db('members/' + room, other, 'GET', undefined, false);
  await db('scores/' + room, other, 'GET', undefined, false);
  await db('rooms/' + room, host, 'PUT', { ...control, seq: 1, phase: 'flight', at: now, until: now + 300000 });
  const score = { mask: 1, boss: false, arcade: 200, lives: 3, sector: 1, status: 'flying', updated: { '.sv': 'timestamp' } };
  const report = 'scores/' + room + '/' + student.localId;
  await db(report, other, 'PUT', score, false);
  await db(report, student, 'PUT', score);
  await db(report, student, 'PUT', score, false);
  const privatePath = 'metrics/' + room + '/' + student.localId;
  await db(privatePath, student, 'PUT', { mission: 1, since: now, attempts: 1, hints: 0, help: true });
  await db(privatePath, other, 'GET', undefined, false);
  await db(privatePath, host, 'GET');
  const spectator = await auth('signUp', {});
  const token = crypto.randomUUID();
  await db('projectors/' + room, host, 'PUT', token);
  await db('projectors/' + room, spectator, 'GET', undefined, false);
  await db('viewAccess/' + room + '/' + spectator.localId, spectator, 'PUT', token);
  await db('scores/' + room, spectator, 'GET');
  await db('metrics/' + room, spectator, 'GET', undefined, false);
  await db('rooms/' + room + '/locked', spectator, 'PUT', true, false);
  await db('seats/' + room + '/1', spectator, 'PUT', spectator.localId, false);
  await db('members/' + room, spectator, 'GET');
  await db('rooms/' + room + '/expires', 'admin', 'PUT', Date.now() - 2000);
  for (const identity of [student, spectator, host]) {
    await db('scores/' + room, identity, 'GET', undefined, false);
  }
  await db('rooms/' + room, student, 'GET', undefined, false);
  await db(privatePath, student, 'GET', undefined, false);
  await db('rooms/' + room, host, 'GET');
  await db('rooms/' + room + '/expires', 'admin', 'PUT', ticket.expires);
  await db(membership + '/kicked', host, 'PUT', true);
  await db(report, student, 'PUT', score, false);
  await db('hosts/' + host.localId, 'admin', 'DELETE');
  await db('rooms/' + room + '/locked', host, 'PUT', true, false);
  console.log('Realtime Database Emulator: ammissione, autorizzazioni, isolamento, tentativi negati e revoca verificati.');
}
