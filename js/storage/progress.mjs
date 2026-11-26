const key = 'code-space:missioni:v1';

export function loadCompleted() {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(data)) return new Set();
    const completed = new Set();
    for (let id = 1; id <= 5 && data.includes(id); id++) completed.add(id);
    return completed;
  } catch {
    return new Set();
  }
}

export function saveCompleted(completed) {
  try {
    localStorage.setItem(key, JSON.stringify([...completed]));
  } catch {
    // Il progresso resta disponibile durante la sessione se lo storage è bloccato.
  }
}
