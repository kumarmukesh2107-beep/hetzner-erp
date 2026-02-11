import { exportDeviceSnapshot, importDeviceSnapshot, NexusTransferSnapshot } from './deviceTransfer';

export interface CloudSnapshotPayload extends NexusTransferSnapshot {
  version: number;
  companyId: string;
  updatedAt: string;
}

const getBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_SYNC_API_BASE_URL as string | undefined;
  return (fromEnv || '').trim().replace(/\/$/, '');
};

const getApiKey = (): string => {
  return (import.meta.env.VITE_SYNC_API_KEY as string | undefined) || '';
};

const buildUrl = (companyId: string): string => {
  const baseUrl = getBaseUrl();
  const encodedCompanyId = encodeURIComponent(companyId);

  if (!baseUrl) {
    // Default to same-origin Vercel proxy endpoint.
    return `/api/sync/${encodedCompanyId}`;
  }

  // Supports all formats:
  // - https://domain.com                 -> /sync/:companyId
  // - https://domain.com/sync            -> /sync/:companyId
  // - https://domain.com/api/sync        -> /api/sync/:companyId
  if (baseUrl.endsWith('/api/sync') || baseUrl.endsWith('/sync')) {
    return `${baseUrl}/${encodedCompanyId}`;
  }

  return `${baseUrl}/sync/${encodedCompanyId}`;
};

const getHeaders = () => {
  const apiKey = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Nexus-API-Key'] = apiKey;
  return headers;
};

export const isCloudSyncConfigured = (): boolean => true;

export const pushCloudSnapshot = async (companyId: string): Promise<void> => {
  const url = buildUrl(companyId);
  const localSnapshot = await exportDeviceSnapshot();

  const payload: CloudSnapshotPayload = {
    ...localSnapshot,
    version: 1,
    companyId,
    updatedAt: new Date().toISOString(),
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ snapshot: payload }),
  });

  if (!response.ok) {
    throw new Error(`Push failed with status ${response.status}`);
  }
};

export const pullCloudSnapshot = async (companyId: string): Promise<CloudSnapshotPayload | null> => {
  const url = buildUrl(companyId);

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const snapshot = data?.snapshot;
  if (!snapshot || typeof snapshot !== 'object') return null;
  return snapshot as CloudSnapshotPayload;
};

export const applyCloudSnapshot = async (snapshot: CloudSnapshotPayload): Promise<void> => {
  await importDeviceSnapshot(snapshot);
};
