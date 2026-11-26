import { command, defaults, nickname, pinNumber } from './model.mjs';

export function sessionService(store, { randomPin = pinNumber, id = () => crypto.randomUUID() } = {}) {
  async function create(title, settings = {}) {
    if (!store.uid) throw Error('Accedi come Host prima di creare una sessione.');
    title = title.trim().slice(0, 60);
    if (!title) throw Error('Inserisci un titolo per la sessione.');
    settings = { ...settings, adventure: true };
    const room = id();
    const created = store.now();
    const expires = created + 3 * 3600000;
    for (let attempt = 0; attempt < 12; attempt++) {
      const pin = randomPin();
      const reservation = { room, owner: store.uid, expires, capacity: settings.capacity ?? defaults.capacity,
        ...(settings.adventure ? { adventure: true } : {}) };
      const path = 'pins/' + pin;
      const existing = await store.get(path);
      if (existing?.expires > store.now()) continue;
      const ok = await store.transaction(path,
        value => !value || value.expires <= store.now() ? reservation : undefined)
        .catch(async error => {
          if ((await store.get(path))?.expires > store.now()) return false;
          throw error;
        });
      if (!ok) continue;
      const data = { owner: store.uid, title, pin, created, expires, phase: 'lobby', seq: 0,
        at: created, until: 0, locked: false, view: 'lobby', reveal: 0, settings: { ...defaults, ...settings } };
      try {
        await store.set('rooms/' + room, data);
        return { room, data };
      } catch (error) {
        await store.set('pins/' + pin, null).catch(() => {});
        throw error;
      }
    }
    throw Error('Non è stato possibile riservare un PIN. Riprova.');
  }

  async function join(pin, input) {
    const name = nickname(input);
    if (!/^\d{6}$/.test(pin)) throw Error('Inserisci un PIN di sei cifre.');
    const uid = await store.student();
    const ticket = await store.get('pins/' + pin);
    if (!ticket) throw Error('PIN inesistente.');
    if (ticket.expires <= store.now()) throw Error('Sessione scaduta.');
    if (!ticket.adventure) throw Error('Questo PIN appartiene alla 2.0. Chiedi all’Host di creare una sessione 2.1.');
    const room = ticket.room;
    const existing = await store.get(`members/${room}/${uid}`);
    if (existing?.kicked) throw Error('Il comandante ti ha rimosso dalla sessione.');
    if (existing) return { room, member: existing };
    if (store.live) {
      const key = name.toLowerCase();
      const capacity = ticket.capacity;
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) throw Error('PIN non ancora disponibile.');
      const start = Math.floor(Math.random() * capacity);
      for (let offset = 0; offset < capacity; offset++) {
        const seat = (start + offset) % capacity;
        const member = { name, key, seat, kicked: false, pin, adventure: true };
        try {
          await store.update({
            [`members/${room}/${uid}`]: member,
            [`seats/${room}/${seat}`]: uid,
            [`names/${room}/${key}`]: uid,
          });
          return { room, member };
        } catch (error) {
          if (!/permission_denied|permission denied/i.test(error.code ?? error.message)) throw error;
          const concurrent = await store.get(`members/${room}/${uid}`);
          if (concurrent?.kicked) throw Error('Il comandante ti ha rimosso dalla sessione.');
          if (concurrent) return { room, member: concurrent };
        }
      }
      throw Error('Ingresso non disponibile. Controlla il PIN, prova un altro nickname o chiedi all’Host.');
    }
    const control = await store.get('rooms/' + room);
    if (!control || control.phase === 'ended') throw Error('Sessione terminata.');
    if (control.locked || (control.phase !== 'lobby' && !control.settings.late)) throw Error('Nuovi ingressi bloccati.');
    const key = name.toLowerCase();
    const namePath = `names/${room}/${key}`;
    const prior = await store.get(namePath);
    if (prior && prior !== uid) throw Error('Nickname già utilizzato.');
    const reserved = prior === uid || await store.transaction(namePath, value => !value ? uid : undefined)
      .catch(async error => {
        if (await store.get(namePath)) return false;
        throw error;
      });
    if (!reserved) throw Error('Nickname già utilizzato.');
    let seat = -1;
    try {
      const seats = await store.get('seats/' + room) ?? {};
      for (let index = 0; index < control.settings.capacity; index++) {
        const path = `seats/${room}/${index}`;
        const holder = seats[index];
        if (holder === uid || (!holder && await store.transaction(path, value => !value ? uid : undefined)
          .catch(async error => {
            if (await store.get(path)) return false;
            throw error;
          }))) {
          seat = index;
          break;
        }
      }
      if (seat < 0) throw Error('Sessione piena.');
      const member = { name, key, seat: String(seat), kicked: false };
      await store.set(`members/${room}/${uid}`, member);
      return { room, member };
    } catch (error) {
      // Due schede con la stessa identità possono aver completato la stessa ammissione.
      const concurrent = await store.get(`members/${room}/${uid}`).catch(() => null);
      if (concurrent && !concurrent.kicked) return { room, member: concurrent };
      if (seat >= 0) await store.set(`seats/${room}/${seat}`, null).catch(() => {});
      await store.set(namePath, null).catch(() => {});
      throw error;
    }
  }

  async function change(room, transform) {
    const path = 'rooms/' + room;
    await store.get(path);
    const applied = await store.transaction(path, current => current ? transform(current) : undefined);
    if (!applied) throw Error('La sessione non è più disponibile.');
  }

  return {
    create, join,
    command: (room, action) => change(room, current => command(current, action, store.now())),
    options: (room, patch) => change(room, current => ({
      ...current, ...patch, settings: { ...current.settings, ...patch.settings }, seq: current.seq + 1,
    })),
    async kick(room, uid, member) {
      await store.update({
        [`members/${room}/${uid}/kicked`]: true,
        [`seats/${room}/${member.seat}`]: null,
        [`names/${room}/${member.key}`]: null,
        [`presence/${room}/${uid}`]: null,
      });
    },
    async remove(room, pin) {
      const ticket = await store.get('pins/' + pin);
      const patch = Object.fromEntries(['rooms', 'members', 'scores', 'metrics', 'presence', 'seats', 'names', 'projectors', 'viewAccess']
        .map(path => [path + '/' + room, null]));
      if (ticket?.room === room) patch['pins/' + pin] = null;
      await store.update(patch);
    },
  };
}
