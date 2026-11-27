export function showInstruments(panel, mission, cases) {
  const kind = mission.effettoNelGioco.pannello;
  panel.replaceChildren();
  panel.hidden = !kind;
  if (!kind) return;
  const samples = cases ?? mission.scenariDiTest.map(({ input, atteso, output }) => ({
    input, variables: atteso, output: output?.join('\n') ?? '',
  }));
  const { variables, input, output } = samples[0];

  function label(text) {
    const item = document.createElement('span');
    item.textContent = text;
    panel.append(item);
  }

  function meter(text, value) {
    label(text);
    const bar = document.createElement('meter');
    bar.max = 100;
    bar.value = value;
    bar.setAttribute('aria-label', text);
    panel.append(bar);
  }

  switch (kind) {
    case 'batteria':
      meter(`Carica iniziale: ${input.energia}/100`, input.energia);
      meter(`Dopo la ricarica: ${variables.energia.value}/100`, variables.energia.value);
      break;
    case 'scafo':
      meter(`Integrità: ${variables.scafo.value}/100`, variables.scafo.value);
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
  }
}
