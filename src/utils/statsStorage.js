const STORAGE_KEY = 'linkslayer-run-history';

export function loadRunHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRun(runData) {
  const history = loadRunHistory();
  history.push({
    id: Date.now(),
    date: new Date().toISOString(),
    ...runData,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearRunHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
