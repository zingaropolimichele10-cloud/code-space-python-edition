import config from './config.mjs';

export async function firebaseAdapter(useEmulator = false, role = 'player') {
  const settings = useEmulator ? (await import('../../emulator/config.mjs')).default : config;
  if (!settings?.projectId || !settings.databaseURL) {
    throw Error('Firebase non è configurato. La modalità individuale e la dimostrazione locale sono disponibili.');
  }
  if (!settings.emulator && (!/^https:\/\/[^/]+\.(?:firebaseio\.com|firebasedatabase\.app)\/?$/.test(settings.databaseURL)
      || !/^[a-z0-9-]+\.firebaseapp\.com$/.test(settings.authDomain ?? ''))) {
    throw Error('Configura gli indirizzi Firebase ufficiali del progetto.');
  }
  const sdk = await import('../../vendor/classroom/sdk.mjs');
  const app = sdk.initializeApp(settings, (useEmulator ? 'classroom-emulator' : 'classroom') + '-' + role);
  const auth = sdk.getAuth(app);
  const db = sdk.getDatabase(app);
  if (settings.emulator) {
    sdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    sdk.connectDatabaseEmulator(db, '127.0.0.1', 9000);
  }
  const ref = path => sdk.ref(db, path);
  let offset = 0;
  const unsubscribeOffset = sdk.onValue(ref('.info/serverTimeOffset'), snap => { offset = snap.val() ?? 0; });
  await auth.authStateReady();
  const listen = (path, fn, fail) => sdk.onValue(ref(path), snapshot => fn(snapshot.val()), fail);
  return {
    emulator: Boolean(settings.emulator), live: true,
    get uid() { return auth.currentUser?.uid; },
    get anonymous() { return auth.currentUser?.isAnonymous; },
    now: () => Math.round(Date.now() + offset),
    timestamp: sdk.serverTimestamp,
    async student() {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        throw Error('Usa un profilo del browser separato per entrare come studente.');
      }
      if (!auth.currentUser) await sdk.signInAnonymously(auth);
      return auth.currentUser.uid;
    },
    async host(email, password) {
      if (auth.currentUser?.isAnonymous) await sdk.signOut(auth);
      if (email) await sdk.signInWithEmailAndPassword(auth, email, password);
      else if (!auth.currentUser) await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
      if ((await sdk.get(ref('hosts/' + auth.currentUser.uid))).val() !== true) {
        throw Error('Account non autorizzato. Il referente deve abilitare il tuo UID nella console Firebase.');
      }
      return auth.currentUser.uid;
    },
    signOut: () => sdk.signOut(auth),
    get: async path => (await sdk.get(ref(path))).val(),
    set: (path, value) => sdk.set(ref(path), value),
    update: patch => sdk.update(sdk.ref(db), patch),
    async transaction(path, change) {
      const result = await sdk.runTransaction(ref(path), change, { applyLocally: false });
      return result.committed;
    },
    listen,
    children(path, table, change, fail) {
      const put = snap => { table[snap.key] = snap.val(); change(); };
      const remove = snap => { delete table[snap.key]; change(); };
      const stops = [sdk.onChildAdded(ref(path), put, fail), sdk.onChildChanged(ref(path), put, fail),
        sdk.onChildRemoved(ref(path), remove, fail)];
      return () => stops.forEach(stop => stop());
    },
    async presence(path) {
      const close = sdk.onDisconnect(ref(path));
      await close.remove();
      await sdk.set(ref(path), true);
      return async () => { await sdk.set(ref(path), null); await close.cancel(); };
    },
    connection: fn => listen('.info/connected', fn),
    dispose: unsubscribeOffset,
  };
}
