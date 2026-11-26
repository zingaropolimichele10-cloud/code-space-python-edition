const presets = {
  motori: ['Propulsori', [['Spinta', 5, 10], ['Margine', 5, 10]]],
  vita: ['Batterie', [['Batteria A', 2, 5], ['Batteria B', 3, 5], ['Totale', 2, 5]]],
  scudo: ['Campo protettivo', [['Generatore', '○ In attesa']]],
  segnale: ['Segnale intercettato', [['Frammento A', 'NORD'], ['Frammento B', '-7'], ['Coordinate', '—']]],
  armi: ['Banco laser', [['Moduli', 3, 4], ['Unità totali', 3, 12]]],
  energia: ['Reattore · 12 unità', [['Motori', 2, 12], ['Armi', 2, 12], ['Difese', 2, 12]]],
  radar: ['Radar · rotte disponibili', [['Ovest', '← Corsia di sicurezza'], ['Est', '→ Corsia diretta']]],
  ciclo: ['Banco di ricarica', [['Impulso 1', 0, 9], ['Impulso 2', 0, 9], ['Impulso 3', 0, 9]]],
  stiva: ['Inventario Aurora', [['0', 'Cavo'], ['1', 'Magnete'], ['2', 'Filtro']]],
  diagnostica: ['Diagnostica', [['Computer di bordo', '⚠ Guasto']]],
  omega: ['Banco Omega', [['Impulsi', '4 + 3 + 3'], ['Carica', 0, 10], ['Superarma', '○ In attesa']]],
};

export function renderPanel(panel, mission, observations = []) {
  const [title, initial] = presets[mission.panel];
  let rows = initial;
  const first = observations[0];
  if (first) {
    const value = first.value;
    const status = flag => flag === true ? '● Attivo' : flag === false ? '○ Disattivato' : '—';
    const result = {
      motori: [['Spinta', value, 10], ['Margine', 10 - value, 10]],
      vita: [...initial.slice(0, 2), ['Totale', value, 5]],
      scudo: observations.map(item => [item.label ?? 'Generatore', status(item.value)]),
      segnale: [...initial.slice(0, 2), ['Coordinate', value]],
      armi: [['Moduli', 3, 4], ['Unità totali', value, 12]],
      energia: mission.budget?.map(name => [name, first.values[name]?.value, 12]),
      radar: observations.map(item => [item.label, item.value === 'ovest' ? '← Ovest' : item.value === 'est' ? '→ Est' : item.value]),
      ciclo: initial.map(([label], index) => [label, Number(first.output.trim().split(/\s+/)[index]), 9]),
      stiva: [...initial, ...observations.map(item => [item.label, item.value])],
      diagnostica: [['Computer di bordo', value]],
      omega: observations.flatMap(item => [[item.label, item.values.carica?.value, 10], ['Superarma', status(item.value)]]),
    };
    rows = result[mission.panel] ?? rows;
  }
  const label = document.createElement('strong');
  label.textContent = title;
  const cells = rows.map(([name, value, max]) => {
    const cell = document.createElement('div');
    const heading = document.createElement('span');
    heading.textContent = name;
    const metric = document.createElement('b');
    metric.textContent = value == null || !Number.isFinite(value) && typeof value === 'number' ? '—' : String(value).slice(0, 48);
    cell.append(heading, metric);
    if (max && Number.isFinite(value)) {
      const gauge = document.createElement('progress');
      gauge.max = max;
      gauge.value = value;
      gauge.setAttribute('aria-label', name);
      cell.append(gauge);
    }
    return cell;
  });
  panel.dataset.system = mission.panel;
  panel.replaceChildren(label, ...cells);
}
