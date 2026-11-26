import { build } from 'esbuild';

await build({
  stdin: { contents: `
    export { initializeApp } from 'firebase/app';
    export { getAuth, signInAnonymously, signInWithRedirect, GoogleAuthProvider,
      onAuthStateChanged, signOut, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
    export { getDatabase, ref, get, set, update, runTransaction, onValue,
      onChildAdded, onChildChanged, onChildRemoved, onDisconnect, serverTimestamp, connectDatabaseEmulator } from 'firebase/database';
    export { default as QRCode } from 'qrcode';
  `, resolveDir: process.cwd(), sourcefile: 'classroom-sdk.mjs' },
  bundle: true, platform: 'browser', format: 'esm', minify: true,
  outfile: process.argv[2] ?? 'vendor/classroom/sdk.mjs',
  legalComments: 'eof',
});
