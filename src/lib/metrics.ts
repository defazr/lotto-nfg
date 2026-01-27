const STORAGE_KEY = "nfg_metrics_v1";

type MetricsData = Record<string, number>;

function getStoredData(): MetricsData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData(data: MetricsData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function inc(key: string): void {
  const data = getStoredData();
  data[key] = (data[key] || 0) + 1;
  saveData(data);
}

export function getAll(): MetricsData {
  return getStoredData();
}

export function reset(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
