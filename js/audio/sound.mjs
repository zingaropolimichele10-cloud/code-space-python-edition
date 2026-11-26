const tones = {
  star: [660, 990], impact: [155, 72], shield: [310, 610], mission: [440, 554, 660],
  success: [523, 659, 784], victory: [523, 659, 784, 1047],
};

export function createAudio({
  Context = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  preferences = { enabled: false, volume: .25 }, onChange = () => {},
} = {}) {
  let { enabled, volume } = preferences;
  let context;
  let master;

  function configure(muted, level) {
    enabled = !muted;
    volume = level;
    if (master) master.gain.value = enabled ? volume * 0.16 : 0;
    onChange({ enabled, volume });
  }

  async function unlock() {
    if (!enabled || !Context) return false;
    try {
      if (!context) {
        context = new Context();
        master = context.createGain();
        master.gain.value = volume * 0.16;
        master.connect(context.destination);
      }
      if (context.state !== 'running') await context.resume();
      return context.state === 'running';
    } catch { return false; }
  }

  function play(name) {
    if (!enabled || volume === 0 || context?.state !== 'running' || !tones[name]) return;
    try {
      const start = context.currentTime;
      tones[name].forEach((frequency, index) => {
        const time = start + index * 0.08;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = name === 'impact' ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0.001, time);
        envelope.gain.exponentialRampToValueAtTime(0.65, time + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        oscillator.connect(envelope).connect(master);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        oscillator.start(time);
        oscillator.stop(time + 0.15);
      });
    } catch { /* Il volo prosegue anche con audio indisponibile. */ }
  }

  return { play, configure, unlock, get enabled() { return enabled; }, get volume() { return volume; } };
}

export function bindAudio(audio) {
  const button = document.getElementById('mute');
  const slider = document.getElementById('volume');
  const status = document.getElementById('audio-status');
  function sync() {
    button.textContent = audio.enabled ? 'Audio attivo' : 'Audio disattivato';
    button.setAttribute('aria-pressed', String(audio.enabled));
    slider.value = String(Math.round(audio.volume * 100));
  }
  const unlock = async () => {
    if (audio.enabled && !await audio.unlock()) status.textContent = 'Audio non disponibile. Puoi continuare a giocare.';
  };
  sync();
  button.addEventListener('click', () => {
    audio.configure(audio.enabled, audio.volume);
    status.textContent = '';
    sync();
    void unlock();
  });
  slider.addEventListener('input', () => audio.configure(!audio.enabled, Number(slider.value) / 100));
  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="tutorial"], [data-action="start"], #continue, #teacher-final, #teacher-launch')) void unlock();
  });
  return sync;
}
