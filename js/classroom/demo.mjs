const key = 'code-space:classroom:demo:v1';

function openStore() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise(resolve => {
    const request = indexedDB.open(key, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('session');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export function demoAdapter(role, { getStorage, tabStorage = () => sessionStorage } = {}) {
  let uid;
  let fallback = {};
  let closed = false;
  let notification;
  const watchers = new Set();
  const database = getStorage ? Promise.resolve(null) : openStore();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(key) : null;

  function at(root, path) {
    return path.split('/').reduce((part, segment) => part?.[segment], root) ?? null;
  }
  function assign(root, path, value) {
    const parts = path.split('/');
    let parent = root;
    for (const part of parts.slice(0, -1)) parent = parent[part] ??= {};
    if (value === null) delete parent[parts.at(-1)];
    else parent[parts.at(-1)] = structuredClone(value);
  }
  function readFallback() {
    if (!getStorage) return fallback;
    try { return JSON.parse(getStorage().getItem(key)) ?? {}; } catch { return fallback; }
  }
  async function transact(write, operation) {
    const db = await database;
    if (!db) {
      const root = readFallback();
      const result = operation(root);
      if (write && result !== undefined) {
        fallback = root;
        try { getStorage?.().setItem(key, JSON.stringify(root)); } catch { /* Mock o demo limitata. */ }
      }
      return result;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session', write ? 'readwrite' : 'readonly');
      const table = tx.objectStore('session');
      const request = table.get('root');
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? Error('Archivio demo indisponibile.'));
      request.onsuccess = () => {
        try {
          const root = request.result ?? {};
          result = operation(root);
          if (write && result !== undefined) table.put(root, 'root');
        } catch (error) { reject(error); tx.abort(); }
      };
    });
  }
  function notify() {
    if (closed || !watchers.size || notification) return;
    notification = setTimeout(() => {
      notification = undefined;
      void transact(false, root => root).then(root => {
        for (const watch of watchers) watch(root);
      }).catch(() => {});
    }, 12);
  }
  async function change(operation) {
    const result = await transact(true, operation);
    if (result !== undefined && !closed) {
      notify();
      channel?.postMessage(true);
    }
    return result;
  }
  function listen(path, fn) {
    let prior;
    const watch = root => {
      const value = at(root, path);
      const json = JSON.stringify(value);
      if (json !== prior) { prior = json; fn(value); }
    };
    watchers.add(watch);
    notify();
    return () => watchers.delete(watch);
  }
  function who() {
    if (uid) return uid;
    try {
      uid = tabStorage().getItem(key + '/' + role) || crypto.randomUUID();
      tabStorage().setItem(key + '/' + role, uid);
    } catch { uid = crypto.randomUUID(); }
    return uid;
  }
  if (channel) channel.onmessage = notify;
  function update(patch) {
    return change(root => {
      for (const [path, value] of Object.entries(patch)) assign(root, path, value);
      return true;
    });
  }
  return {
    emulator: false, live: false,
    get uid() { return uid; },
    now: Date.now, timestamp: Date.now,
    student: async () => who(), host: async () => who(),
    get: path => transact(false, root => at(root, path)),
    set: (path, value) => update({ [path]: value }),
    update,
    async transaction(path, modify) {
      return Boolean(await change(root => {
        const result = modify(at(root, path));
        if (result === undefined) return undefined;
        assign(root, path, result);
        return true;
      }));
    },
    listen,
    children(path, table, redraw) {
      return listen(path, next => {
        for (const item of Object.keys(table)) delete table[item];
        Object.assign(table, next);
        redraw();
      });
    },
    async presence(path) {
      await update({ [path]: true });
      const release = () => { void update({ [path]: null }).catch(() => {}); };
      globalThis.addEventListener?.('pagehide', release, { once: true });
      return () => { globalThis.removeEventListener?.('pagehide', release); return update({ [path]: null }); };
    },
    connection: fn => { fn(true); return () => {}; },
    dispose() {
      closed = true;
      clearTimeout(notification);
      channel?.close();
      watchers.clear();
      void database.then(db => db?.close());
    },
  };
}
