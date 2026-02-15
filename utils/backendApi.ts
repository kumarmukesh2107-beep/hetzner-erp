const rawBase = (import.meta.env.VITE_SYNC_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

const toUrl = (moduleName: string) => `${API_BASE}/${encodeURIComponent(moduleName)}`;

export const postModuleSnapshot = async (moduleName: string, payload: unknown): Promise<void> => {
  try {
    await fetch(toUrl(moduleName), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`[backendApi] failed to persist ${moduleName}:`, error);
  }
};

export const getModuleSnapshot = async <T>(moduleName: string): Promise<T | null> => {
  try {
    const response = await fetch(toUrl(moduleName));
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error(`[backendApi] failed to fetch ${moduleName}:`, error);
    return null;
  }
};
