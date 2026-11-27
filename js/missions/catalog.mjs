import { missions as adventure } from './adventure.mjs';

export const MAIN_MISSIONS = 5;

export const missions = adventure.map(m => ({
  ...m,
  title: m.titolo,
  concept: m.concetto,
  briefing: m.problema + ' ' + m.perche,
  goal: m.cosaFare,
  explanation: m.spiegazione,
  source: m.codiceIniziale,
  solution: m.soluzioneEsempio,
  hints: m.indizi,
  edit: m.cosaFare,
  preview: m.anteprimaDidattica,
  reward: m.effettoNelGioco.anteprima,
  upgrade: {
    ...m.effettoNelGioco.upgrade,
    ...(m.id === 5 ? { maxLives: 5 } : {}),
    ...(m.id === 7 ? { rapid: true } : {}),
    ...(m.id === 12 ? { navigator: true } : {}),
    ...(m.id === 16 ? { reactor: true } : {}),
    ...(m.id === 18 ? { magnet: true } : {}),
    ...(m.id === 20 ? { autopilot: true } : {}),
    ...(m.id === 22 ? { omega: true } : {})
  },
  success: m.effettoNelGioco.esito,
  optional: m.id > MAIN_MISSIONS,
  panel: 'adventure'
}));

export const MISSION_COUNT = missions.length;
export const MISSION_MASK = (1 << MISSION_COUNT) - 1;
