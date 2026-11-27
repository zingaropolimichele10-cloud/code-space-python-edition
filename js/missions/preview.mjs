export function showInstruments(panel, mission, cases) {
  const kind = mission.effettoNelGioco.pannello;
  panel.replaceChildren();
  panel.hidden = !kind;
  if (!kind) return;
  if (!cases && mission.anteprimaDidattica && kind !== 'scafo') { panel.hidden = true; return; }
  const samples = cases ?? mission.scenariDiTest.map(({ input, atteso, output }) => ({
    input, variables: atteso, output: output?.join('\n') ?? '',
  }));
  const { variables, input, output } = samples[0];

  function label(text) {
    const item = document.createElement('span');
    item.textContent = text;
    panel.append(item);
    return item;
  }

  function meter(text, value) {
    label(text);
    const bar = document.createElement('meter');
    bar.max = 100;
    bar.value = value;
    bar.setAttribute('aria-label', text);
    panel.append(bar);
  }

  // Ogni passo corrisponde a una riga stampata e verificata nel Worker.
  function steps(format) {
    output.trimEnd().split('\n').forEach((line, index) => {
      const item = label(format(line, index));
      if (cases) {
        item.classList.add('calc-step');
        item.style.setProperty('--step-delay', `${index * 100}ms`);
      }
    });
  }

  switch (kind) {
    case 'batteria':
      meter(`Carica iniziale: ${input.energia}/100`, input.energia);
      meter(`Dopo la ricarica: ${variables.energia.value}/100`, variables.energia.value);
      break;
    case 'scafo':
      meter('Integrità iniziale: 100/100', 100);
      meter(`Danni subiti: ${input.danni}`, input.danni);
      if (cases) meter(`Integrità residua: ${variables.scafo.value}/100`, variables.scafo.value);
      break;
    case 'laser':
      label(`● Calibrato · Potenza ${variables.danno.value}`);
      break;
    case 'motori':
      for (let n = 1; n <= input.motori; n++) label(`Motore ${n} · ${variables.per_motore.value} unità`);
      break;
    case 'radio':
      label(variables.messaggio.value);
      break;
    case 'registro':
      label(output.trimEnd());
      break;
    case 'riserva':
      for (const sample of samples) {
        label(`${sample.input.vite} vite · ${sample.variables.scudo.value ? 'Accesa' : 'Spenta'}`);
      }
      break;
    case 'radar':
      for (const sample of samples) {
        const devia = sample.variables.rotta.value === 'devia';
        label(`${sample.input.distanza} unità · ${devia ? '↗ Devia' : '↑ Continua'}`);
      }
      break;
    case 'allarme':
      for (const sample of samples) {
        const color = sample.variables.allarme.value;
        label(`${sample.input.energia} unità · ${color}`).dataset.signal = color;
      }
      break;
    case 'sicurezza':
      for (const sample of samples) {
        const { vite, energia } = sample.input;
        label(`${vite} vite · ${energia} energia · ${sample.variables.scudo.value ? 'Via libera' : 'In attesa'}`);
      }
      break;
    case 'impulsi':
      steps((line, index) => `${line} ${index + 1}`);
      break;
    case 'generatore':
      steps((line, index) => `Giro ${index + 1} · ${line} unità`);
      break;
    case 'conto':
      steps(line => line);
      label(`Fine · ${variables.contatore.value}`);
      for (const sample of samples.slice(1)) {
        const values = sample.output.trimEnd().split('\n').filter(Boolean);
        const sequence = values.length ? values.join(' → ') : 'nessun giro';
        label(`Da ${sample.input.contatore} · ${sequence} · Fine: ${sample.variables.contatore.value}`);
      }
      break;
    case 'stiva':
      for (const item of variables.inventario.value) label(item);
      label(`${variables.totale.value} oggetti`);
      break;
    case 'scansione':
      for (const sample of samples) {
        const cargo = sample.output.trimEnd().split('\n').filter(Boolean);
        label(`${cargo.join(' · ') || 'Stiva vuota'} → Carburante ${sample.variables.trovato.value ? 'presente' : 'assente'}`);
      }
      break;
    case 'diagnostica':
      label(output.trimEnd());
      label(samples[1].output ? samples[1].output.trimEnd() : 'Segnale assente · Terminale in attesa');
      break;
    case 'comando':
      for (const sample of samples) label(`Generatore · Scudo ${sample.variables.scudo.value ? 'attivo' : 'spento'}`);
      break;
    case 'omega':
      for (const sample of samples) {
        const impulses = sample.input.impulsi.join(' + ') || 'Nessun impulso';
        label(`${impulses} → ${sample.variables.totale.value} · Omega ${sample.variables.omega.value ? 'attivo' : 'in attesa'}`);
      }
      break;
  }
}
