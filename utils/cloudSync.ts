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
  if (!baseUrl) {
    throw new Error('Cloud sync base URL is not configured. Set VITE_SYNC_API_BASE_URL.');
  }

  const encodedCompanyId = encodeURIComponent(companyId);
  return `${baseUrl}/sync/${encodedCompanyId}`;
};

const getHeaders = () => {
  const apiKey = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Nexus-API-Key'] = apiKey;
  return headers;
};

export const isCloudSyncConfigured = (): boolean => {
  const explicitToggle = (import.meta.env.VITE_ENABLE_CLOUD_SYNC as string | undefined)?.trim().toLowerCase();
  if (explicitToggle === 'true') return true;
  if (explicitToggle === 'false') return false;

  // Safe default: do not auto-enable cloud reconciliation unless sync env is present.
  // This prevents accidental overwrite of local ERP data in deployments without intended sync setup.
  return Boolean(getBaseUrl() || getApiKey());
};

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
