import { downloadFile, readJson } from '../storage/files.mjs';
import { archiveCsv, archiveEntry, importArchive, localValue, mergeReports, privateReportFields, saveLocal, studentRecovery } from './recovery.mjs';
import { MAIN_MISSIONS, missions, MISSION_COUNT, MISSION_MASK } from '../missions/catalog.mjs';
import { gate, ranking } from './model.mjs';
import { sessionService } from './session.mjs';
import { demoAdapter } from './demo.mjs';
import { firebaseAdapter } from './firebase.mjs';
import config from './config.mjs';

const get = id => document.getElementById(id);
get('flight-telemetry').addEventListener('click', event => {
  const expanded = event.currentTarget.getAttribute('aria-expanded') !== 'true';
  event.currentTarget.setAttribute('aria-expanded', String(expanded));
  get('class-telemetry').classList.toggle('telemetry-open', expanded);
});
const params = new URLSearchParams(location.search);
const role = ['host', 'projector'].includes(params.get('role')) ? params.get('role') : 'student';
const demo = params.get('demo') === '1';
const emulator = !demo && params.get('emulator') === '1' && ['localhost', '127.0.0.1'].includes(location.hostname);
const namespace = 'code-space:classroom:' + (demo ? 'demo' : emulator ? 'emulator' : 'live') + ':' + role;
const phaseText = { lobby: 'Sala d’attesa', flight: 'In volo', paused: 'Pausa globale', boss: 'Boss finale', ended: 'Sessione terminata' };
const stateText = { waiting: 'In attesa', flying: 'In gioco', python: 'Missione Python', paused: 'In pausa', gameover: 'Game over', boss: 'Boss finale', finished: 'Missione conclusa' };
const concepts = missions.map(mission => mission.concept);
const legacyConcepts = ['variabili e velocità', 'variabili e vite', 'booleani', 'stringhe', 'condizioni if'];
const texts = { lobby: 'In attesa del comandante', offline: 'Sincronizzazione sospesa', ended: 'Sessione conclusa', expired: 'Sessione scaduta', kicked: 'Il comandante ti ha rimosso' };
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
const rememberedStorage = () => student && demo ? sessionStorage : localStorage;
const readRemembered = () => localValue(namespace, rememberedStorage());
const remember = value => saveLocal(namespace, value, rememberedStorage());
const studentKey = id => namespace + ':flight:' + id + ':' + store.uid;
const hostKey = () => namespace + ':archive:' + store.uid;
let localFlight, lastLocalWrite = 0;
let archive = new Map();
let imported = new Map();

function saveFlight(immediate = false) {
  if (!localFlight || !room || !store?.uid) return;
  if (!immediate && Date.now() - lastLocalWrite < 850) return;
  if (saveLocal(studentKey(room), localFlight, rememberedStorage())) lastLocalWrite = Date.now();
}
addEventListener('pagehide', () => saveFlight(true));
addEventListener('codespace:before-update', () => saveFlight(true));

function drawArchive() {
  const select = get('host-history');
  const current = select.value;
  const items = [...archive.values(), ...[...imported.values()].filter(item => !archive.has(item.room))];
  items.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  select.replaceChildren(new Option('Seleziona una sessione', ''), ...items.map(item =>
    new Option(`${item.title} · ${item.pin}${item.ended ? ' · archiviata' : ''}${archive.has(item.room) ? '' : ' · da backup'}`, item.room)));
  if (items.some(item => item.room === current)) select.value = current;
}

function archiveCurrent(ended = false, participants = members, results = scores) {
  if (!host || !room || !control || control.owner !== store.uid) return;
  const old = archive.get(room);
  const hasResults = Object.keys(participants).length > 0;
  const entry = archiveEntry({
    room, pin: control.pin, title: control.title, phase: ended ? 'ended' : control.phase,
    expires: control.expires, timing: control, group: old?.group ?? 0, ended, savedAt: Date.now(),
    settings: { ...control.settings, duration: control.settings.minutes },
    results: hasResults || !old?.results.length
      ? ranking(participants, results, control.settings.adventure).map(row => ({
        name: row.name, rank: row.rank, points: row.total, missions: completed(row.mask), boss: row.boss,
      })) : old.results,
  });
  archive.set(room, entry);
  saveLocal(hostKey(), [...archive.values()]);
  drawArchive();
}

async function recoverHost(id) {
  const existing = id && await store.get('rooms/' + id).catch(() => null);
  if (!existing?.settings.adventure || existing.owner !== store.uid || existing.expires <= store.now()) {
    throw Error('La sessione non è più attiva o non è autorizzata. I risultati importati restano consultabili tramite esportazione.');
  }
  remember({ room: id, uid: store.uid });
  attach(id);
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
  if (!demo && navigator.onLine === false) return Promise.reject(Error('Connessione assente. Puoi giocare da solo.'));
  if (!boot.pending) boot.pending = (demo ? Promise.resolve(demoAdapter(role)) : firebaseAdapter(emulator, projector ? 'projection' : 'player'))
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
  return (control?.settings.adventure ? concepts : legacyConcepts).reduce((count, _, index) => count + Number(Boolean(mask & (1 << index))), 0);
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
  const rows = ranking(members, scores, control.settings.adventure);
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
    document.querySelector('[data-option=reveal]').textContent = `Rivela posto (${control.reveal}/3)`;
    document.querySelector('[data-option=lock]').textContent = control.locked ? 'Consenti ingressi' : 'Blocca ingressi';
    document.querySelector('[data-option=rocks]').textContent = control.settings.rocks ? 'Sospendi asteroidi' : 'Riattiva asteroidi';
  }
  if (student) {
    const prior = me && [...rows].reverse().find(row => row.rank < me.rank);
    const distance = prior ? ` · ${prior.total - me.total} punti dalla posizione precedente` : '';
    const learned = me ? (control.settings.adventure ? concepts : legacyConcepts).filter((_, index) => me.mask & (1 << index)) : [];
    const main = completed((me?.mask ?? 0) & ((1 << MAIN_MISSIONS) - 1));
    const totals = control.settings.adventure
      ? ` · Missioni totali: ${learned.length}/${MISSION_COUNT} · Principali: ${main}/${MAIN_MISSIONS} · Bonus: ${learned.length - main}/${MISSION_COUNT - MAIN_MISSIONS}`
      : '';
    set('player-summary', me ? `${me.name} · posizione ${me.rank} · ${me.total} punti${distance}${totals} · obiettivo: ${control.settings.required} missioni${current === 'ended' ? ' · Concetti allenati: ' + (learned.join(', ') || 'puoi continuare a esercitarti in modalità individuale') : ''}` : '');
    get('help').hidden = !me || ['ended', 'expired', 'kicked', 'offline', 'lobby'].includes(current);
    get('help').disabled = false;
    set('help', help ? 'Annulla richiesta di aiuto' : 'Chiedi aiuto');
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
      cell(tr, online(row.uid) ? (current === 'paused' ? 'In pausa' : stateText[row.status ?? 'waiting']) : 'Disconnesso');
      cell(tr, online(row.uid) ? 'Connesso' : 'Disconnesso');
      cell(tr, info.mission ? info.mission + ' · ' + duration((current === 'paused' ? control.at : store.now()) - info.since) : '—');
      cell(tr, control.settings.adventure ? (info.attempts ?? 0) + ' · ' + (info.errors ?? 0) + ' errori' : info.attempts ?? 0);
      cell(tr, info.hints ?? 0);
      const aid = cell(tr, info.help ? 'Aiuto richiesto' : stale ? 'Da seguire' : '—');
      if (info.help || stale) aid.className = 'needs-help';
      if (info.help) {
        const resolve = document.createElement('button');
        resolve.type = 'button';
        resolve.className = 'secondary';
        resolve.textContent = 'Risolvi richiesta';
        resolve.disabled = !connected || !ready || current === 'ended';
        resolve.setAttribute('aria-label', 'Risolvi richiesta di ' + row.name);
        resolve.addEventListener('click', () => {
          void run(async () => {
            await store.set(`metrics/${room}/${row.uid}/help`, false);
          }, resolve);
        });
        aid.append(document.createElement('br'), resolve);
      }

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
  saveFlight(true);
  room = control = undefined;
  members = {}; scores = {}; metrics = {}; presence = {}; previousRank = {}; rowMoves = {};
  localFlight = undefined; lastLocalWrite = 0;
  latest = undefined; lastReport = privateReport = ''; help = forcedEnd = frameReady = ready = false;
  frameRoom = undefined; sentPolicy = '';
  get('flight-frame').src = 'about:blank';
  get('flight-telemetry').setAttribute('aria-expanded', 'false');
  get('class-telemetry').classList.remove('telemetry-open');
  get('flight-frame').hidden = true;
  get('projector-link').removeAttribute('href');
  get('room-panel').hidden = true;
  get('entry').hidden = false;
}
function attach(id) {
  stopRoom();
  room = id;
  if (student) {
    const saved = localValue(studentKey(id), rememberedStorage());
    localFlight = { schema: 1, recovery: studentRecovery(saved?.schema === 1 ? saved.recovery : null),
      queue: saved?.schema === 1 ? saved.queue : null };
    if (localFlight.queue?.room === id) {
      latest = mergeReports(null, localFlight.queue, localFlight.queue.phase);
      help = latest.help === true;
    }
  }
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
    if (host && (next.phase !== 'ended' || !archive.get(id)?.ended)) archiveCurrent(next.phase === 'ended');
    const join = link({ pin: next.pin });
    if (get('join-link').href !== join && !student) {
      get('join-link').href = join;
      if (host) {
        const path = 'projectors/' + id;
        store.get(path).then(async key => {
          if (!key) {
            const candidate = crypto.randomUUID();
            await store.transaction(path, current => current || candidate);
            key = await store.get(path);
          }
          if (room === id) get('projector-link').href = link({ role: 'projector', room: id, key });
        }).catch(fail);
      }
      import('../../vendor/classroom/sdk.mjs').then(({ QRCode }) => QRCode.toDataURL(join, { width: 148, margin: 2 }))
        .then(url => { if (id === room) get('join-qr').src = url; }).catch(fail);
    }
    drawSoon();
  }, failSync));
  for (const [path, target] of [['members', members], ['scores', scores], ['presence', presence], ...(host ? [['metrics', metrics]] : [])]) {
    stops.push(store.children(path + '/' + id, target, drawSoon, failSync));
  }

  if (student) {
    stops.push(store.listen(`metrics/${id}/${store.uid}/help`, value => {
      if (value === false && help) {
        const sent = privateReport ? JSON.parse(privateReport) : null;
        if (sent?.help === true) {
          help = false;
          sent.help = false;
          privateReport = JSON.stringify(sent);
          if (latest) latest = { ...latest, help: false };
          if (localFlight) {
            localFlight.queue = latest;
            saveFlight(true);
          }
          get('flight-frame').contentWindow?.postMessage({
            type: 'cs:help-resolved', room
          }, location.origin);
          drawSoon();
          clock();
        }
      }
    }, failSync));
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
        const confirmed = await store.get(`scores/${id}/${store.uid}`).catch(() => null);
        if (epoch !== presenceEpoch) return;
        if (confirmed) scores[store.uid] = confirmed;
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
  const bossLeft = current === 'boss' ? Math.max(0, control.bossUntil - now) : null;
  if (key === sentPolicy) {
    frame.contentWindow.postMessage({ type: 'cs:heartbeat', room, seq: control.seq, bossLeft }, location.origin);
    return;
  }
  sentPolicy = key;
  frame.contentWindow.postMessage({
    type: 'cs:policy', room, state: current, seq: control.seq, settings: control.settings,
    completed: (scores[store.uid]?.mask ?? 0) | (latest?.mask ?? 0), recovery: localFlight?.recovery,
    bossLeft, bossSeconds: bossLeft == null ? 0 : Math.ceil(bossLeft / 1000),
    arcade: Math.max(scores[store.uid]?.arcade ?? 0, latest?.arcade ?? 0), bossWon: scores[store.uid]?.boss ?? false,
  }, location.origin);
}

async function report(current, now) {
  if (!student || !latest || writing || !ready || !connected || now - lastWrite < 1100) return;
  const publicAllowed = ['flight', 'boss'].includes(current);
  if (!publicAllowed && current !== 'paused') return;
  const uid = store.uid;
  const last = scores[uid] ?? {};
  const submitted = latest;
  const reportRoom = room;
  const pendingBoss = latest.boss && latest.bossAt === control.at;
  const safeInt = (value, max) => Math.max(0, Math.min(max, Math.trunc(Number(value) || 0)));
  const publicData = {
    adventure: true,
    mask: (last.mask ?? 0) | safeInt(latest.mask, MISSION_MASK), arcade: Math.max(last.arcade ?? 0, safeInt(latest.arcade, 1000)),
    boss: last.boss === true || (current === 'boss' && pendingBoss === true), lives: safeInt(latest.lives, 5),
    sector: safeInt(latest.sector, 4), status: Object.hasOwn(stateText, latest.status) ? latest.status : 'waiting',
  };
  const privateData = { adventure: true, ...privateReportFields({ ...latest, help }) };
  privateData.since = privateData.mission ? Math.max(0, privateData.since + now - Date.now()) : 0;
  const publicKey = JSON.stringify(publicData);
  const privateKey = JSON.stringify(privateData);
  if (publicKey === lastReport && privateKey === privateReport) return;
  writing = true;
  lastWrite = now;
  try {
    const patch = {};
    if (publicAllowed && publicKey !== lastReport) patch[`scores/${room}/${uid}`] = { ...publicData, updated: store.timestamp() };
    if (privateKey !== privateReport) patch[`metrics/${room}/${uid}`] = privateData;
    if (Object.keys(patch).length) await store.update(patch);
    if (room !== reportRoom) return;
    if (publicAllowed) lastReport = publicKey;
    privateReport = privateKey;
    if (latest === submitted && publicAllowed && localFlight) {
      localFlight.queue = null;
      saveFlight(true);
    }
  } catch (error) {
    if (['flight', 'boss', 'paused'].includes(policy())) fail(error);
  } finally { writing = false; }
}

addEventListener('message', event => {
  if (!student || event.origin !== location.origin || event.source !== get('flight-frame').contentWindow) return;
  if (event.data?.type === 'cs:ready') {
    frameReady = true;
    sentPolicy = '';
    clock();
  } else if (event.data?.type === 'cs:save' && event.data.room === room && localFlight) {
    localFlight.recovery = studentRecovery(event.data.recovery);
    saveFlight(true);
  } else if (event.data?.type === 'cs:report' && event.data.room === room && localFlight) {
    if (latest?.mission !== event.data.mission) help = false;
    const phase = control?.phase;
    const old = latest;
    const oldForBoss = old?.bossAt === control?.at ? old : { ...old, boss: false };
    latest = mergeReports(oldForBoss, { ...event.data, help, phase, bossAt: control?.at }, phase);
    localFlight.queue = latest;
    saveFlight(old?.mask !== latest.mask || old?.boss !== latest.boss || old?.mission !== latest.mission);
    clock();
  }
});
document.body.dataset.role = role;
get('host-panel').hidden = !host;
get('join-panel').hidden = !student;
get('projector-entry').hidden = !projector;
get('host-email').hidden = !host || !(emulator || (!demo && config?.hostEmail));
get('host-login').hidden = !host || (!demo && !emulator && config?.hostGoogle === false);
get('join-pin').value = /^\d{6}$/.test(params.get('pin') ?? '') ? params.get('pin') : '';
get('demo-link').hidden = demo;
get('switch-role').href = link({ role: host ? 'student' : 'host' });
get('switch-role').textContent = host ? 'Accesso studente' : 'Accesso Host';
get('demo-link').href = demo ? link() : new URL('./classroom.html?demo=1&role=' + (host ? 'host' : 'student'), location.href).href;
if (demo) set('connection', 'Dimostrazione locale · apri Host e studente in schede dello stesso browser.');
if (emulator) set('connection', 'Firebase Emulator Suite · ambiente di prova.');
if (!demo && !emulator && !config) set('feedback', 'Firebase non configurato. Puoi giocare da solo o aprire la dimostrazione locale.');
if (!demo && !emulator && !config) get('feedback').hidden = false;
if (demo) get('host-login').textContent = 'Entra come Host dimostrativo';
if (demo) get('projector-login').textContent = 'Apri proiettore dimostrativo';

async function login(email, password) {
  const adapter = await boot();
  if (projector) {
    const id = params.get('room') ?? '';
    const key = params.get('key') ?? '';
    const token = /^[a-z0-9-]{36}$/;
    if (!token.test(id) || !token.test(key)) throw Error('Apri il collegamento proiettore generato dall’Host.');
    const uid = await adapter.student();
    if (demo && await store.get('projectors/' + id) !== key) throw Error('Collegamento proiettore non autorizzato.');
    await store.set(`viewAccess/${id}/${uid}`, key);
    attach(id);
    return;
  }
  const uid = await adapter.host(email, password);
  get('create-form').hidden = false;
  get('host-workspace').hidden = false;
  archive = new Map();
  imported = new Map();
  for (const [key, index] of [[hostKey(), archive], [hostKey() + ':imports', imported]]) {
    const items = localValue(key);
    if (Array.isArray(items)) for (const value of items) {
      try { const item = archiveEntry(value); index.set(item.room, item); } catch { /* Record non valido. */ }
    }
  }
  drawArchive();
  get('host-login').hidden = true;
  get('host-email').hidden = true;
  const item = readRemembered();
  if (item?.room && (!item.uid || item.uid === uid)) await recoverHost(item.room).catch(() => {});
  get('recover-host').hidden = true;
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
    const group = Number(get('host-group').value);
    const title = group ? 'Gruppo ' + group : values.get('title');
    const result = await service.create(title, options);
    archive.set(result.room, archiveEntry({ room: result.room, pin: result.data.pin, title, group, savedAt: Date.now(), results: [] }));
    remember({ room: result.room, uid: store.uid });
    attach(result.room);
  }, event.submitter);
});
async function join(pin, name) {
  await boot();
  const result = await service.join(pin, name);
  remember({ pin, name: result.member.name, room: result.room, uid: store.uid });
  get('recover-student').hidden = true;
  attach(result.room);
}
get('join-form').addEventListener('submit', event => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  void run(() => join(values.get('pin'), values.get('name')), event.submitter);
});
async function recoverStudent(prior) {
  if (!prior || !/^\d{6}$/.test(prior.pin)) throw Error('Nessuna partita Classroom da recuperare.');
  const adapter = await boot();
  if (demo) await adapter.student();
  if (!adapter.uid || (!demo && adapter.anonymous !== true) || (prior.uid && prior.uid !== adapter.uid)) {
    throw Error('L’identità della partita non è più disponibile. Entra con un nuovo PIN.');
  }
  const ticket = await adapter.get('pins/' + prior.pin);
  if (!ticket?.adventure || (prior.room && ticket.room !== prior.room) || ticket.expires <= adapter.now()) throw Error('La sessione non è più disponibile.');
  const member = await adapter.get(`members/${ticket.room}/${adapter.uid}`);
  if (!member || member.kicked || member.name !== prior.name) throw Error('Iscrizione non recuperabile.');
  remember({ pin: prior.pin, name: member.name, room: ticket.room, uid: adapter.uid });
  get('recover-student').hidden = true;
  attach(ticket.room);
}
if (student) {
  const prior = readRemembered();
  if (prior && (!params.has('pin') || prior.pin === params.get('pin'))) {
    get('recover-student').hidden = false;
    get('recover-student').addEventListener('click', event => void run(() => recoverStudent(prior), event.currentTarget));
    void run(() => recoverStudent(prior));
  }
}
if (projector && params.has('room')) void run(() => login());
if (host) {
  const prior = readRemembered();
  get('recover-host').hidden = !demo || !prior?.room;
  get('recover-host').addEventListener('click', event => void run(() => login(), event.currentTarget));
  if (!demo && (config || emulator)) {
    const button = get('host-login');
    button.disabled = true;
    void boot().then(adapter => {
      if (prior?.room && adapter.uid && !adapter.anonymous) {
        get('recover-host').hidden = false;
        void run(() => login());
      }
    }).catch(fail).finally(() => { button.disabled = false; });
  } else if (demo && prior?.room) void run(() => login());
}
const selectedArchive = () => archive.get(get('host-history').value) ?? imported.get(get('host-history').value);
get('host-restore').addEventListener('click', event => void run(() => recoverHost(selectedArchive()?.room), event.currentTarget));
get('host-export-json').addEventListener('click', () => {
  if (!host || !store?.uid) return;
  if (control && control.phase !== 'ended') archiveCurrent();
  const entries = [...archive.values(), ...[...imported.values()].filter(item => !archive.has(item.room))];
  downloadFile('code-space-sessioni.json', JSON.stringify({ schema: 1, kind: 'code-space-classroom', sessions: entries }, null, 2));
});
get('host-export-csv').addEventListener('click', () => {
  if (!host || !store?.uid) return;
  const selection = selectedArchive();
  const entries = [...archive.values(), ...[...imported.values()].filter(item => !archive.has(item.room))];
  downloadFile('code-space-risultati.csv', archiveCsv(selection ? [selection] : entries), 'text/csv;charset=utf-8');
});
get('host-import').addEventListener('change', event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || !host || !store?.uid) return;
  void run(async () => {
    for (const entry of importArchive(await readJson(file))) imported.set(entry.room, entry);
    saveLocal(hostKey() + ':imports', [...imported.values()]);
    drawArchive();
    set('archive-status', 'Backup aperto in sola lettura. I risultati online restano invariati.');
  });
});
get('host-delete-archive').addEventListener('click', () => {
  const selection = selectedArchive();
  if (selection?.room === room && control?.phase !== 'ended') { set('archive-status', 'Termina la sessione prima di eliminare la voce locale.'); return; }
  if (!host || !store?.uid || !selection || !confirm('Eliminare questa voce dall’archivio locale?')) return;
  archive.delete(selection.room);
  imported.delete(selection.room);
  saveLocal(hostKey() + ':imports', [...imported.values()]);
  saveLocal(hostKey(), [...archive.values()]);
  drawArchive();
});

for (const button of document.querySelectorAll('[data-command]')) {
  button.addEventListener('click', () => {
    const action = button.dataset.command;
    if (action === 'end' && !confirm('Terminare la sessione per tutti?')) return;
    void run(async () => {
      await service.command(room, action);
      if (action === 'end') {
        const [participants, results] = await Promise.all([store.get('members/' + room), store.get('scores/' + room)])
          .catch(() => [members, scores]);
        archiveCurrent(true, participants, results);
      }
    }, button);
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
  void run(async () => { archiveCurrent(true); await service.remove(room, control.pin); remember(null); stopRoom(); });
});
get('new-room').addEventListener('click', () => {
  if (control.phase !== 'ended' && !confirm('Terminare questa sessione e prepararne una nuova?')) return;
  void run(async () => {
    if (control.phase !== 'ended') await service.command(room, 'end');
    archiveCurrent(true);
    const group = archive.get(room)?.group ?? 0;
    if (group > 0 && group < 3) get('host-group').value = String(group + 1);
    remember(null);
    stopRoom();
  });
});
get('sign-out').addEventListener('click', () => void run(async () => {
  stopRoom();
  await store.signOut?.();
  location.reload();
}));
get('help').addEventListener('click', () => {
  help = !help;
  if (localFlight && latest) { localFlight.queue = { ...latest, help }; saveFlight(true); }
  drawSoon();
  clock();
});
get('rank-search').addEventListener('input', drawSoon);
get('rank-order').addEventListener('change', drawSoon);
setInterval(clock, 250);
setInterval(() => { if (host && room) drawSoon(); }, 5000);

setInterval(() => { if (host && ready && control && control.phase !== 'ended') archiveCurrent(); }, 15000);
