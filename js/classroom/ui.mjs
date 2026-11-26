import { gate, ranking } from './model.mjs';
import { sessionService } from './session.mjs';
import { demoAdapter } from './demo.mjs';
import { firebaseAdapter } from './firebase.mjs';
import config from './config.mjs';

const get = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const role = ['host', 'projector'].includes(params.get('role')) ? params.get('role') : 'student';
const demo = params.get('demo') === '1';
const emulator = !demo && params.get('emulator') === '1' && ['localhost', '127.0.0.1'].includes(location.hostname);
const namespace = 'code-space:classroom:' + (demo ? 'demo' : emulator ? 'emulator' : 'live') + ':' + role;
const phaseText = { lobby: 'Sala d’attesa', flight: 'In volo', paused: 'Pausa globale', boss: 'Boss finale', ended: 'Sessione terminata' };
const stateText = { waiting: 'In attesa', flying: 'In gioco', python: 'Missione Python', paused: 'In pausa', gameover: 'Game over', boss: 'Boss finale', finished: 'Missione conclusa' };
const concepts = ['variabili e velocità', 'variabili e vite', 'booleani', 'stringhe', 'condizioni if'];
const texts = { lobby: 'In attesa del comandante', offline: 'Sincronizzazione sospesa', ended: 'Sessione conclusa' };
const host = role === 'host';
const projector = role === 'projector';
const student = role === 'student';
let store, service, room, control, connected, ready, stops = [], endPresence, presenceEpoch = 0;
let members = {}, scores = {}, metrics = {}, presence = {}, previousRank = {}, rowMoves = {};
let selected, renderPending = false, frameReady = false, sentPolicy = '', frameRoom, busy = false;
let latest, lastReport = '', privateReport = '', lastWrite = 0, writing = false, help = false, forcedEnd = false;
let expiresAction = '';

function set(id, value) {
  const node = get(id);
  if (node.textContent !== value) node.textContent = value;
}
function readRemembered() {
  try { return JSON.parse((student && demo ? sessionStorage : localStorage).getItem(namespace)); } catch { return null; }
}
function remember(value) {
  try {
    const storage = student && demo ? sessionStorage : localStorage;
    if (value) storage.setItem(namespace, JSON.stringify(value));
    else storage.removeItem(namespace);
  } catch { /* Il gioco resta utilizzabile senza persistenza. */ }
}
function fail(error) {
  const message = error?.code === 'PERMISSION_DENIED' || error?.code === 'permission-denied'
    ? 'Operazione non autorizzata. Verifica il ruolo, il PIN e lo stato della sessione.'
    : error?.message || 'Operazione non riuscita.';
  get('feedback').hidden = false;
  set('feedback', message);
}
async function run(action, trigger) {
  if (busy) return;
  busy = true;
  if (trigger) trigger.disabled = true;
  get('feedback').hidden = true;
  try { await action(); } catch (error) { fail(error); } finally {
    busy = false;
    if (trigger) trigger.disabled = false;
    drawSoon();
  }
}
function link(extra = {}) {
  const url = new URL('./classroom.html', location.href);
  for (const [key, value] of Object.entries({ ...(demo ? { demo: '1' } : emulator ? { emulator: '1' } : {}), ...extra })) {
    url.searchParams.set(key, value);
  }
  return url.href;
}
function boot() {
  if (!boot.pending) boot.pending = (demo ? Promise.resolve(demoAdapter(role)) : firebaseAdapter(emulator))
    .then(adapter => { store = adapter; service = sessionService(adapter); return adapter; })
    .catch(error => { boot.pending = undefined; throw error; });
  return boot.pending;
}
function policy() {
  if (forcedEnd) return 'ended';
  if (student && members[store?.uid]?.kicked) return 'kicked';
  return gate(control, connected && ready && (!student || Boolean(members[store?.uid])), store?.now() ?? Date.now());
}
function duration(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
function drawSoon() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => { renderPending = false; draw(); });
}
function cell(row, content, tag = 'td') {
  const node = document.createElement(tag);
  node.textContent = String(content);
  row.append(node);
  return node;
}
function completed(mask) {
  return concepts.reduce((count, _, index) => count + Number(Boolean(mask & (1 << index))), 0);
}
function online(uid) {
  return Boolean(presence[uid] && Object.keys(presence[uid]).length);
}
function arrange(rows) {
  const moves = {};
  for (const row of rows) {
    if (previousRank[row.uid] && previousRank[row.uid] !== row.rank) {
      moves[row.uid] = previousRank[row.uid] - row.rank;
    } else if (rowMoves[row.uid]) moves[row.uid] = rowMoves[row.uid];
    previousRank[row.uid] = row.rank;
  }
  rowMoves = moves;
}
function draw() {
  if (!room || !control) return;
  const current = policy();
  const rows = ranking(members, scores);
  arrange(rows);
  const me = rows.find(row => row.uid === store.uid);
  const count = rows.filter(row => online(row.uid)).length;
  const missionCount = rows.reduce((total, row) => total + completed(row.mask), 0);
  set('room-title', control.title);
  set('phase-label', phaseText[control.phase]);
  set('pin-value', control.pin);
  set('participants', `${count} connessi · ${rows.length - count} disconnessi`);
  set('room-message', control.message || '');
  get('pin-panel').hidden = student || (projector && control.view !== 'lobby');
  get('host-controls').hidden = !host;
  get('rank-tools').hidden = !host;
  if (host) {
    const fought = rows.filter(row => row.status === 'boss' && !row.boss).length;
    const won = rows.filter(row => row.boss).length;
    set('host-totals', `${missionCount} missioni Python · Boss: ${fought} in corso, ${won} completati`);
    get('live-difficulty').value = control.settings.difficulty;
    for (const button of document.querySelectorAll('[data-command]')) {
      const action = button.dataset.command;
      button.disabled = !connected || !ready || busy || !(
        action === 'end' && current !== 'ended' ||
        action === 'start' && current === 'lobby' ||
        action === 'resume' && current === 'paused' ||
        action === 'pause' && ['flight', 'boss'].includes(current) ||
        action === 'boss' && current === 'flight');
    }
    for (const button of document.querySelectorAll('[data-option]')) {
      button.disabled = !connected || !ready || busy || (button.dataset.option === 'reveal' && (control.view !== 'podium' || control.reveal >= 3));
    }
    document.querySelector('[data-option=lock]').textContent = control.locked ? 'Consenti ingressi' : 'Blocca ingressi';
    document.querySelector('[data-option=rocks]').textContent = control.settings.rocks ? 'Sospendi asteroidi' : 'Riattiva asteroidi';
  }
  if (student) {
    const prior = me && [...rows].reverse().find(row => row.rank < me.rank);
    const distance = prior ? ` · ${prior.total - me.total} punti dalla posizione precedente` : '';
    const learned = me ? concepts.filter((_, index) => me.mask & (1 << index)) : [];
    set('player-summary', me ? `${me.name} · posizione ${me.rank} · ${me.total} punti${distance} · obiettivo: ${control.settings.required} missioni${current === 'ended' ? ' · Concetti allenati: ' + (learned.join(', ') || 'puoi continuare a esercitarti in modalità individuale') : ''}` : '');
    get('help').hidden = !me || ['ended', 'kicked', 'offline', 'lobby'].includes(current);
    get('help').disabled = help;
    set('help', help ? 'Aiuto richiesto' : 'Chiedi aiuto');
  }
  get('rank').hidden = projector && control.view === 'lobby';
  get('podium').hidden = control.view !== 'podium';
  const display = host ? rows.filter(row => row.name.toLowerCase().includes(get('rank-search').value.toLowerCase()))
    : student ? rows.filter(row => row.rank <= 3 || row.uid === store.uid) : rows;
  const order = get('rank-order').value;
  if (host && order === 'name') display.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  if (host && order === 'help') display.sort((a, b) => Number(metrics[b.uid]?.help ?? false) - Number(metrics[a.uid]?.help ?? false) || a.rank - b.rank);
  const head = document.createElement('tr');
  const headers = ['Pos.', 'Nickname', 'Punti', 'Python'];
  if (host) headers.push('Variazione', 'Vite', 'Settore', 'Stato', 'Connessione', 'Missione / tempo', 'Tentativi', 'Indizi', 'Aiuto', 'Azioni');
  for (const name of headers) cell(head, name, 'th').scope = 'col';
  get('rank-head').replaceChildren(head);
  const body = document.createDocumentFragment();
  for (const row of display) {
    const tr = document.createElement('tr');
    tr.dataset.uid = row.uid;
    if (row.uid === selected || (student && row.uid === store.uid)) tr.classList.add('selected-player');
    cell(tr, row.rank);
    const name = cell(tr, row.name);
    if (host) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = row.name;
      button.setAttribute('aria-pressed', String(row.uid === selected));
      button.addEventListener('click', () => { selected = row.uid; drawSoon(); });
      name.replaceChildren(button);
    }
    cell(tr, row.total);
    cell(tr, completed(row.mask));
    if (host) {
      const info = metrics[row.uid] ?? {};
      const stale = info.mission && store.now() - info.since >= 90000 && current !== 'paused';
      const move = rowMoves[row.uid];
      cell(tr, move ? (move > 0 ? '+' : '−') + Math.abs(move) : '—');
      cell(tr, row.lives ?? '—');
      cell(tr, row.sector === 4 ? 'Finale' : row.sector != null ? row.sector + 1 : '—');
      cell(tr, online(row.uid) ? stateText[row.status ?? 'waiting'] : 'Disconnesso');
      cell(tr, online(row.uid) ? 'Connesso' : 'Disconnesso');
      cell(tr, info.mission ? info.mission + ' · ' + duration((current === 'paused' ? control.at : store.now()) - info.since) : '—');
      cell(tr, info.attempts ?? 0);
      cell(tr, info.hints ?? 0);
      const aid = cell(tr, info.help ? 'Aiuto richiesto' : stale ? 'Da seguire' : '—');
      if (info.help || stale) aid.className = 'needs-help';
      const action = cell(tr, '');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Rimuovi';
      button.disabled = !connected || !ready || current === 'ended';
      button.setAttribute('aria-label', 'Rimuovi ' + row.name);
      button.addEventListener('click', () => {
        if (confirm('Rimuovere ' + row.name + ' dalla sessione?')) void run(() => service.kick(room, row.uid, members[row.uid]), button);
      });
      action.append(button);
    }
    body.append(tr);
  }
  const focused = document.activeElement?.closest('tr')?.dataset.uid;
  const previousLabel = document.activeElement?.getAttribute('aria-label');
  get('rank-body').replaceChildren(body);
  if (focused) {
    const row = [...get('rank-body').rows].find(item => item.dataset.uid === focused);
    [...(row?.querySelectorAll('button') ?? [])].find(button => button.getAttribute('aria-label') === previousLabel)?.focus({ preventScroll: true });
  }
  const podium = document.createDocumentFragment();
  if (control.view === 'podium') {
    for (const position of [3, 2, 1].slice(0, control.reveal)) {
      const group = rows.filter(row => row.rank === position);
      if (!group.length) continue;
      const card = document.createElement('article');
      const title = document.createElement('h3');
      title.textContent = position + '° posto' + (group.length > 1 ? ' · Pari merito' : '');
      card.append(title);
      for (const row of group) {
        const text = document.createElement('p');
        text.textContent = `${row.name} · ${row.total} punti · ${completed(row.mask)} missioni`;
        card.append(text);
      }
      podium.append(card);
    }
  }
  get('podium-list').replaceChildren(podium);
  clock();
}
function clock() {
  if (!room || !control) return;
  const current = policy();
  const now = store.now();
  const left = control.phase === 'paused' ? control.remaining : control.until - now;
  set('clock', current === 'countdown' ? `Decollo tra ${Math.ceil((control.at - now) / 1000)}`
    : current === 'boss' ? `Boss · ${duration(control.bossUntil - now)}`
    : texts[current] || `Rimanente ${duration(left)} · Trascorso ${duration(control.settings.minutes * 60000 - left)}`);
  const mode = demo ? 'Dimostrazione locale · nessuna connessione Firebase' : emulator ? 'Firebase Emulator Suite' : 'Classroom online';
  set('connection', mode + (connected && ready ? ' · Connesso' : ' · Sincronizzazione sospesa'));
  if (host && connected && ready && expiresAction !== control.seq) {
    const expired = current === 'ended' && control.phase !== 'ended';
    const recover = current === 'boss' && now > control.bossUntil + 1800;
    if (expired || recover) {
      expiresAction = control.seq;
      void run(() => service.command(room, expired ? 'end' : 'debrief'));
    }
  }
  syncFrame(current, now);
  void report(current, now);
}
function stopRoom() {
  stops.forEach(stop => stop());
  stops = [];
  presenceEpoch++;
  if (endPresence) void Promise.resolve(endPresence()).catch(() => {});
  endPresence = undefined;
  room = control = undefined;
  members = {}; scores = {}; metrics = {}; presence = {}; previousRank = {}; rowMoves = {};
  latest = undefined; lastReport = privateReport = ''; help = forcedEnd = frameReady = ready = false;
  frameRoom = undefined; sentPolicy = '';
  get('flight-frame').src = 'about:blank';
  get('flight-frame').hidden = true;
  get('room-panel').hidden = true;
  get('entry').hidden = false;
}
function attach(id) {
  stopRoom();
  room = id;
  get('entry').hidden = true;
  get('room-panel').hidden = false;
  const failSync = error => {
    ready = false;
    clock();
    fail(error);
  };
  stops.push(store.listen('rooms/' + id, next => {
    if (!next) { forcedEnd = true; clock(); return; }
    if (control && next.seq < control.seq) return;
    control = next;
    const join = link({ pin: next.pin });
    if (get('join-link').href !== join && !student) {
      get('join-link').href = join;
      get('projector-link').href = link({ role: 'projector', room: id });
      import('../../vendor/classroom/sdk.mjs').then(({ QRCode }) => QRCode.toDataURL(join, { width: 148, margin: 2 }))
        .then(url => { if (id === room) get('join-qr').src = url; }).catch(fail);
    }
    drawSoon();
  }, failSync));
  for (const [path, target] of [['members', members], ['scores', scores], ['presence', presence], ...(host ? [['metrics', metrics]] : [])]) {
    stops.push(store.children(path + '/' + id, target, drawSoon, failSync));
  }
  stops.push(store.connection(on => {
    connected = on;
    ready = false;
    const epoch = ++presenceEpoch;
    if (!on) { clock(); return; }
    void (async () => {
      const fresh = await store.get('rooms/' + id);
      if (epoch !== presenceEpoch) return;
      if (!fresh) { forcedEnd = true; clock(); return; }
      if (!control || fresh.seq >= control.seq) control = fresh;
      if (student) {
        const member = await store.get(`members/${id}/${store.uid}`);
        if (epoch !== presenceEpoch) return;
        if (member) members[store.uid] = member;
        if (member && !member.kicked && fresh.phase !== 'ended') {
          const release = await store.presence(`presence/${id}/${store.uid}/${crypto.randomUUID()}`);
          if (epoch !== presenceEpoch) { await release(); return; }
          endPresence = release;
        }
      }
      ready = true;
      drawSoon();
    })().catch(failSync);
  }));
}

function syncFrame(current, now) {
  if (!student) return;
  const frame = get('flight-frame');
  if (['flight', 'boss'].includes(current) && !frameRoom) {
    frameRoom = room;
    frame.src = './index.html?classroom=1';
    frame.hidden = false;
  }
  if (!frameReady || frameRoom !== room) return;
  const key = [current, control.seq, scores[store.uid]?.mask ?? 0].join('/');
  if (key === sentPolicy) return;
  sentPolicy = key;
  frame.contentWindow.postMessage({
    type: 'cs:policy', room, state: current, seq: control.seq, settings: control.settings,
    completed: scores[store.uid]?.mask ?? 0, bossSeconds: Math.max(0, Math.ceil((control.bossUntil - now) / 1000)),
    arcade: scores[store.uid]?.arcade ?? 0, bossWon: scores[store.uid]?.boss ?? false,
  }, location.origin);
}

async function report(current, now) {
  if (!student || !latest || writing || !ready || !connected || now - lastWrite < 1100) return;
  if (!['flight', 'boss'].includes(current)) return;
  const uid = store.uid;
  const last = scores[uid] ?? {};
  const safeInt = (value, max) => Math.max(0, Math.min(max, Math.trunc(Number(value) || 0)));
  const publicData = {
    mask: (last.mask ?? 0) | safeInt(latest.mask, 31), arcade: Math.max(last.arcade ?? 0, safeInt(latest.arcade, 1000)),
    boss: last.boss === true || (current === 'boss' && latest.boss === true), lives: safeInt(latest.lives, 5),
    sector: safeInt(latest.sector, 4), status: Object.hasOwn(stateText, latest.status) ? latest.status : 'waiting',
  };
  const privateData = { mission: safeInt(latest.mission, 5), since: safeInt(latest.since, 9999999999999) || now,
    attempts: safeInt(latest.attempts, 2000), hints: safeInt(latest.hints, 3), help };
  if (!privateData.mission) privateData.since = 0;
  const publicKey = JSON.stringify(publicData);
  const privateKey = JSON.stringify(privateData);
  if (publicKey === lastReport && privateKey === privateReport) return;
  writing = true;
  lastWrite = now;
  try {
    const patch = {};
    if (publicKey !== lastReport) patch[`scores/${room}/${uid}`] = { ...publicData, updated: store.timestamp() };
    if (privateKey !== privateReport) patch[`metrics/${room}/${uid}`] = privateData;
    await store.update(patch);
    lastReport = publicKey;
    privateReport = privateKey;
  } catch (error) {
    if (['flight', 'boss'].includes(policy())) fail(error);
  } finally { writing = false; }
}

addEventListener('message', event => {
  if (!student || event.origin !== location.origin || event.source !== get('flight-frame').contentWindow) return;
  if (event.data?.type === 'cs:ready') {
    frameReady = true;
    sentPolicy = '';
    clock();
  } else if (event.data?.type === 'cs:report' && event.data.room === room) {
    if (latest?.mission !== event.data.mission) help = false;
    latest = event.data;
    clock();
  }
});
document.body.dataset.role = role;
get('host-panel').hidden = !host;
get('join-panel').hidden = !student;
get('projector-entry').hidden = !projector;
get('host-email').hidden = !host || !(emulator || config?.hostEmail);
get('join-pin').value = /^\d{6}$/.test(params.get('pin') ?? '') ? params.get('pin') : '';
get('demo-link').hidden = demo;
get('demo-link').href = demo ? link() : new URL('./classroom.html?demo=1&role=' + (host ? 'host' : 'student'), location.href).href;
if (demo) set('connection', 'Dimostrazione locale · apri Host e studente in schede dello stesso browser.');
if (emulator) set('connection', 'Firebase Emulator Suite · ambiente di prova.');
if (!demo && !emulator && !config) set('feedback', 'Firebase non configurato. Puoi giocare da solo o aprire la dimostrazione locale.');
if (!demo && !emulator && !config) get('feedback').hidden = false;
if (demo) get('host-login').textContent = 'Entra come Host dimostrativo';
if (demo) get('projector-login').textContent = 'Apri proiettore dimostrativo';

async function login(email, password) {
  const adapter = await boot();
  const uid = await adapter.host(email, password);
  if (projector) {
    const id = params.get('room');
    const existing = id && await store.get('rooms/' + id);
    if (!existing || existing.owner !== uid) throw Error('Questo proiettore è riservato all’Host della sessione.');
    attach(id);
    return;
  }
  get('create-form').hidden = false;
  get('host-login').hidden = true;
  get('host-email').hidden = true;
  const item = readRemembered();
  const existing = item?.room && await store.get('rooms/' + item.room).catch(() => null);
  if (existing?.owner === uid && existing.expires > store.now()) attach(item.room);
}
get('host-login').addEventListener('click', event => void run(() => login(), event.currentTarget));
get('projector-login').addEventListener('click', event => void run(() => login(), event.currentTarget));
get('host-email').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const password = values.get('password');
  form.elements.password.value = '';
  void run(() => login(values.get('email'), password), event.submitter);
});
get('create-form').addEventListener('submit', event => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const options = Object.fromEntries(['capacity', 'minutes', 'bossSeconds', 'required'].map(key => [key, Number(values.get(key))]));
  for (const key of ['audio', 'skip', 'late']) options[key] = values.has(key);
  options.difficulty = values.get('difficulty');
  void run(async () => {
    const result = await service.create(values.get('title'), options);
    remember({ room: result.room });
    attach(result.room);
  }, event.submitter);
});
async function join(pin, name) {
  await boot();
  const result = await service.join(pin, name);
  remember({ pin, name: result.member.name });
  attach(result.room);
}
get('join-form').addEventListener('submit', event => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  void run(() => join(values.get('pin'), values.get('name')), event.submitter);
});
if (student) {
  const prior = readRemembered();
  if (prior && (!params.has('pin') || prior.pin === params.get('pin'))) void run(() => join(prior.pin, prior.name));
}
if (projector && demo) void run(() => login());
if (projector && !demo && !emulator) {
  void boot().then(adapter => { if (adapter.uid && !adapter.anonymous) return run(() => login()); }).catch(fail);
}
for (const button of document.querySelectorAll('[data-command]')) {
  button.addEventListener('click', () => {
    const action = button.dataset.command;
    if (action === 'end' && !confirm('Terminare la sessione per tutti?')) return;
    void run(() => service.command(room, action), button);
  });
}
for (const button of document.querySelectorAll('[data-option]')) {
  button.addEventListener('click', () => {
    const option = button.dataset.option;
    const updates = {
      lock: { locked: !control.locked }, rocks: { settings: { rocks: !control.settings.rocks } },
      assist: { settings: { difficulty: 'calm' } }, rank: { view: 'rank' },
      podium: { view: 'podium', reveal: 0 }, reveal: { reveal: Math.min(3, control.reveal + 1) },
    };
    void run(() => service.options(room, updates[option]), button);
  });
}
get('live-difficulty').addEventListener('change', event => {
  const difficulty = event.target.value;
  void run(() => service.options(room, { settings: { difficulty } }));
});
get('message-form').addEventListener('submit', event => {
  event.preventDefault();
  const message = new FormData(event.currentTarget).get('message').trim();
  if (message) void run(() => service.options(room, { message }), event.submitter);
});
get('delete-room').addEventListener('click', () => {
  if (!confirm('Eliminare definitivamente questa sessione e i relativi dati?')) return;
  void run(async () => { await service.remove(room, control.pin); remember(null); stopRoom(); });
});
get('new-room').addEventListener('click', () => {
  if (control.phase !== 'ended' && !confirm('Terminare questa sessione e prepararne una nuova?')) return;
  void run(async () => {
    if (control.phase !== 'ended') await service.command(room, 'end');
    remember(null);
    stopRoom();
  });
});
get('sign-out').addEventListener('click', () => void run(async () => {
  stopRoom();
  await store.signOut?.();
  location.reload();
}));
get('help').addEventListener('click', () => { help = true; drawSoon(); clock(); });
get('rank-search').addEventListener('input', drawSoon);
get('rank-order').addEventListener('change', drawSoon);
setInterval(clock, 250);
setInterval(() => { if (host && room) drawSoon(); }, 5000);
