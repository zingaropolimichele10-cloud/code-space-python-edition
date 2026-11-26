const banner = document.getElementById('offline-notice');
if (navigator.serviceWorker) {
  addEventListener('load', () => {
    // Lascia iniziare il volo prima della lettura del pacchetto completo.
    setTimeout(async () => {
      if (!navigator.onLine) return;
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
        function showUpdate() {
          if (!registration.waiting || !navigator.serviceWorker.controller) return;
          banner.hidden = false;
          banner.textContent = 'Aggiornamento scaricato. Chiudi tutte le schede di CODE SPACE e riapri il gioco per applicarlo.';
        }
        function watchInstall() {
          registration.installing?.addEventListener('statechange', showUpdate);
        }
        registration.addEventListener('updatefound', watchInstall);
        watchInstall();
        showUpdate();
        if (registration.active && !registration.waiting && !registration.installing) {
          await registration.update();
        }
      } catch {
        // HTTP su LAN e profili con cache bloccata possono usare il server direttamente.
      }
    }, 1800);
  }, { once: true });
}
