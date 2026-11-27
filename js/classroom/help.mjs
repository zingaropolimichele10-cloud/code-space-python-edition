const statuses = ['open', 'cancelled', 'resolved'];
export function validHelp(value) {
  return value && typeof value.id === 'string' && /^[0-9a-f-]{36}$/.test(value.id) &&
    statuses.includes(value.status) ? { id: value.id, status: value.status } : null;
}

export function changeHelp(currentValue, operation) {
  const current = validHelp(currentValue);
  const next = validHelp(operation?.next);
  if (!next || (current?.id ?? null) !== (operation.previous?.id ?? null) ||
      (current?.status ?? null) !== (operation.previous?.status ?? null)) return undefined;
  if (next.status === 'open') {
    return current?.status !== 'open' && next.id !== current?.id ? next : undefined;
  }
  return current?.status === 'open' && next.id === current.id ? next : undefined;
}

export async function applyHelp(store, path, operation) {
  // Precarica il valore per il primo callback di runTransaction su riferimenti non ancora in cache.
  await store.get(path);
  const committed = await store.transaction(path, current => changeHelp(current, operation));
  const current = validHelp(await store.get(path));
  return { committed, current };
}
