export const defaults = Object.freeze({
  capacity: 30, minutes: 40, difficulty: 'standard', bossSeconds: 60,
  audio: false, required: 4, skip: true, late: true, rocks: true,
});
export const phases = ['lobby', 'flight', 'paused', 'boss', 'ended'];
export const statuses = ['waiting', 'flying', 'python', 'paused', 'gameover', 'boss', 'finished'];
const blockedNames = /(?:cazzo|merda|vaffanculo|stronzo|fuck|shit)/i;

export function nickname(input) {
  const value = input.trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{1,15}$/.test(value) || blockedNames.test(value)) {
    throw Error('Usa uno pseudonimo di 2–16 caratteri. Inizia con una lettera e usa lettere, numeri, trattini o _. Evita nomi reali e termini offensivi.');
  }
  return value;
}

export function pinNumber(random = crypto) {
  const words = new Uint32Array(1);
  const ceiling = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  do random.getRandomValues(words); while (words[0] >= ceiling);
  return String(words[0] % 1_000_000).padStart(6, '0');
}

export function score(entry) {
  const missions = Number.isInteger(entry.mask) ? entry.mask & 31 : 0;
  const main = [1, 2, 4, 8].filter(bit => missions & bit).length;
  return main * 1000 + (missions & 16 ? 500 : 0) + (entry.boss ? 500 : 0)
    + Math.max(0, Math.min(1000, Math.trunc(entry.arcade || 0)));
}

export function ranking(members, scores) {
  const rows = Object.entries(members ?? {}).filter(([, member]) => !member.kicked)
    .map(([uid, member]) => ({ uid, name: member.name, mask: 0, ...scores?.[uid] }))
    .map(row => ({ ...row, total: score(row) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'it') || a.uid.localeCompare(b.uid));
  rows.forEach((row, index) => { row.rank = index && rows[index - 1].total === row.total ? rows[index - 1].rank : index + 1; });
  return rows;
}

export function command(control, mode, now) {
  const { phase, at, until, remaining = 0, bossUntil = 0, bossRemaining = 0 } = control;
  const next = { ...control, seq: control.seq + 1 };
  if (mode === 'start' && phase === 'lobby') {
    return { ...next, phase: 'flight', at: now + 5000, until: now + 5000 + control.settings.minutes * 60000 };
  }
  if (mode === 'pause' && ['flight', 'boss'].includes(phase) && now >= at && now < until) {
    return { ...next, phase: 'paused', previous: phase, remaining: until - now,
      bossRemaining: Math.max(0, bossUntil - now), at: now };
  }
  if (mode === 'resume' && phase === 'paused') {
    return { ...next, phase: control.previous, at: now, until: now + remaining,
      bossUntil: bossRemaining ? now + bossRemaining : 0 };
  }
  if (mode === 'boss' && phase === 'flight' && now >= at && until > now + 5000) {
    return { ...next, phase: 'boss', at: now + 5000,
      bossUntil: Math.min(until, now + 5000 + control.settings.bossSeconds * 1000) };
  }
  if (mode === 'debrief' && phase === 'boss' && now >= bossUntil) {
    return { ...next, phase: 'flight', at: now, bossUntil: 0, bossRemaining: 0 };
  }
  if (mode === 'end' && phase !== 'ended') return { ...next, phase: 'ended', at: now, locked: true };
  throw Error('Questo comando non è disponibile nello stato attuale.');
}

export function gate(control, connected, now) {
  if (!connected || !control || now >= control.expires) return 'offline';
  if (control.phase === 'ended' || (['flight', 'boss'].includes(control.phase) && now >= control.until)) return 'ended';
  if (control.phase === 'lobby' || control.phase === 'paused') return control.phase;
  return now < control.at ? 'countdown' : control.phase;
}
