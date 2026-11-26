const key = 'code-space:classroom:demo:v1';

export function demoAdapter(role, { getStorage = () => localStorage, tabStorage = () => sessionStorage } = {}) {
  let uid;
  let fallback = {};
  const watchers = new Set();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(key) : null;
  function state() {
    try { return JSON.parse(getStorage().getItem(key)) ?? {}; } catch { return fallback; }
  }
  function at(root, path) {
    return path.split('/').reduce((part, segment) => part?.[segment], root) ?? null;
  }
  function notify() {
    const root = state();
    for (const watch of watchers) watch(root);
  }
  function write(root) {
    fallback = root;
    try { getStorage().setItem(key, JSON.stringify(root)); } catch { /* Demo in memoria. */ }
    notify();
    channel?.postMessage(true);
  }
  function assign(root, path, value) {
    const parts = path.split('/');
    let parent = root;
    for (const part of parts.slice(0, -1)) parent = parent[part] ??= {};
    if (value === null) delete parent[parts.at(-1)];
    else parent[parts.at(-1)] = structuredClone(value);
  }
  const protect = work => globalThis.navigator?.locks?.request(key, work) ?? Promise.resolve().then(work);
  function listen(path, fn) {
    let prior;
    const watch = root => {
      const value = at(root, path);
      const json = JSON.stringify(value);
      if (json !== prior) { prior = json; fn(value); }
    };
    watchers.add(watch);
    watch(state());
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
  globalThis.addEventListener?.('storage', notify);
  function update(patch) {
    return protect(() => {
      const root = state();
      for (const [path, value] of Object.entries(patch)) assign(root, path, value);
      write(root);
    });
  }
  return {
    emulator: false, live: false,
    get uid() { return uid; },
    now: Date.now, timestamp: Date.now,
    student: async () => who(), host: async () => who(),
    get: async path => at(state(), path),
    set: (path, value) => update({ [path]: value }),
    update,
    transaction: (path, change) => protect(() => {
      const root = state();
      const result = change(at(root, path));
      if (result === undefined) return false;
      assign(root, path, result);
      write(root);
      return true;
    }),
    listen,
    children(path, table, change) {
      return listen(path, next => {
        for (const item of Object.keys(table)) delete table[item];
        Object.assign(table, next);
        change();
      });
    },
    async presence(path) {
      await update({ [path]: true });
      const release = () => {
        const root = state();
        assign(root, path, null);
        write(root);
      };
      globalThis.addEventListener?.('pagehide', release, { once: true });
      return () => { globalThis.removeEventListener?.('pagehide', release); release(); };
    },
    connection: fn => { fn(true); return () => {}; },
    dispose() {
      channel?.close();
      globalThis.removeEventListener?.('storage', notify);
      watchers.clear();
    },
  };
}
