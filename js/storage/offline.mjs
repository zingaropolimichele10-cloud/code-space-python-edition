const banner = document.getElementById('offline-notice');
const workers = navigator.serviceWorker;

if (banner && workers && window === window.top) {
  const message = document.createElement('span');
  const apply = document.createElement('button');
  apply.type = 'button';
  apply.textContent = 'Aggiorna ora';
  banner.replaceChildren(message, ' ', apply);
  const updatePage = location.pathname.endsWith('/aggiorna.html');

  function playing() {
    const state = document.getElementById('viewport')?.dataset.state;
    const room = document.getElementById('room-panel');
    return Boolean(state && !['MENU', 'VICTORY'].includes(state)) || Boolean(room && !room.hidden);
  }

  async function register() {
    if (!navigator.onLine) return;
    try {
      const registration = await workers.register('./sw.js', { updateViaCache: 'none' });
      let requested = false;
      let reloading = false;
      function showUpdate() {
        if (requested || reloading) return;
        banner.hidden = !registration.waiting;
        message.textContent = 'Aggiornamento scaricato.';
        apply.disabled = false;
      }

      apply.addEventListener('click', () => {
        if (requested || reloading || !registration.waiting) return;
        if (playing() && !confirm('Vuoi aggiornare ora? La pagina si ricaricherà. Potrai riprendere dal checkpoint o rientrare nella stanza Classroom.')) return;
        // Scrive subito la bozza e le preferenze che potrebbero essere ancora in attesa.
        dispatchEvent(new Event('codespace:before-update'));
        requested = true;
        apply.disabled = true;
        message.textContent = 'Aggiornamento in corso…';
        try {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch {
          requested = false;
          showUpdate();
        }
      });

      workers.addEventListener('controllerchange', () => {
        if (!workers.controller) {
          showUpdate();
          return;
        }
        if (reloading) return;
        if (!requested) {
          dispatchEvent(new Event('codespace:before-update'));
        }
        reloading = true;
        if (updatePage) location.replace('./index.html');
        else location.reload();
      });

      function watchInstall() {
        registration.installing?.addEventListener('statechange', showUpdate);
      }
      registration.addEventListener('updatefound', watchInstall);
      watchInstall();
      showUpdate();
      if (registration.active && !registration.waiting && !registration.installing) await registration.update();
    } catch {
      // HTTP su LAN e profili con cache bloccata possono usare il server direttamente.
    }
  }

  addEventListener('load', () => {
    setTimeout(register, updatePage ? 0 : 1800);
  }, { once: true });
}
