import { exportDeviceSnapshot, importDeviceSnapshot, NexusTransferSnapshot } from './deviceTransfer';

export interface CloudSnapshotPayload extends NexusTransferSnapshot {
  version: number;
  companyId: string;
  updatedAt: string;
}

const DEFAULT_SYNC_BASE = '/sync';

const getBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_SYNC_API_BASE_URL as string | undefined;
  return (fromEnv || DEFAULT_SYNC_BASE).trim().replace(/\/$/, '');
};

const hasSyncEnv = (): boolean => {
  return Boolean((import.meta.env.VITE_SYNC_API_BASE_URL as string | undefined)?.trim());
};

const getApiKey = (): string => {
  return (import.meta.env.VITE_SYNC_API_KEY as string | undefined) || '';
};

const normalizeSyncPrefix = (baseUrl: string): string => {
  if (baseUrl.endsWith('/sync')) return baseUrl;
  if (baseUrl.endsWith('/api/sync')) return baseUrl;
  if (baseUrl.endsWith('/api')) return `${baseUrl}/sync`;
  return `${baseUrl}/sync`;
};

const buildPrimaryUrl = (companyId: string): string => {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('Cloud sync base URL is not configured. Set VITE_SYNC_API_BASE_URL.');
  }

  const encodedCompanyId = encodeURIComponent(companyId);
  const syncPrefix = normalizeSyncPrefix(baseUrl);
  return `${syncPrefix}/${encodedCompanyId}`;
};

const buildFallbackUrl = (primaryUrl: string): string | null => {
  if (primaryUrl.includes('/api/sync/')) {
    return primaryUrl.replace('/api/sync/', '/sync/');
  }

  if (primaryUrl.includes('/sync/')) {
    return primaryUrl.replace('/sync/', '/api/sync/');
  }

  return null;
};

const getHeaders = () => {
  const apiKey = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Nexus-API-Key'] = apiKey;
  return headers;
};

const fetchWithSyncFallback = async (url: string, init: RequestInit): Promise<Response> => {
  const primary = await fetch(url, init);
  if (primary.status !== 404) return primary;

  const fallbackUrl = buildFallbackUrl(url);
  if (!fallbackUrl || fallbackUrl === url) return primary;

  return fetch(fallbackUrl, init);
};

export const isCloudSyncConfigured = (): boolean => {
  const explicitToggle = (import.meta.env.VITE_ENABLE_CLOUD_SYNC as string | undefined)?.trim().toLowerCase();
  if (explicitToggle === 'true') return true;
  if (explicitToggle === 'false') return false;

  // Safe default: do not auto-enable cloud reconciliation unless sync env is present.
  // This prevents accidental overwrite of local ERP data in deployments without intended sync setup.
  return Boolean(hasSyncEnv() || getApiKey());
};

export const pushCloudSnapshot = async (companyId: string): Promise<void> => {
  const url = buildPrimaryUrl(companyId);
  const localSnapshot = await exportDeviceSnapshot();

  const payload: CloudSnapshotPayload = {
    ...localSnapshot,
    version: 1,
    companyId,
    updatedAt: new Date().toISOString(),
  };

  const response = await fetchWithSyncFallback(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ snapshot: payload }),
  });

  if (!response.ok) {
    throw new Error(`Push failed with status ${response.status}`);
  }
};

export const pullCloudSnapshot = async (companyId: string): Promise<CloudSnapshotPayload | null> => {
  const url = buildPrimaryUrl(companyId);

  const response = await fetchWithSyncFallback(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const snapshot = data?.snapshot ?? data?.data?.snapshot ?? data?.data;
  if (!snapshot || typeof snapshot !== 'object') return null;
  return snapshot as CloudSnapshotPayload;
};

export const applyCloudSnapshot = async (snapshot: CloudSnapshotPayload): Promise<void> => {
  await importDeviceSnapshot(snapshot);
};
