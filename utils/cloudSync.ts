import { exportDeviceSnapshot, importDeviceSnapshot, NexusTransferSnapshot } from './deviceTransfer';

const SYNC_PATH_PREFIX = '/sync';

export interface CloudSnapshotPayload extends NexusTransferSnapshot {
  version: number;
  companyId: string;
  updatedAt: string;
}

const getBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_SYNC_API_BASE_URL as string | undefined;
  return (fromEnv || '').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return (import.meta.env.VITE_SYNC_API_KEY as string | undefined) || '';
};

const buildUrl = (companyId: string) => {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;
  return `${baseUrl}${SYNC_PATH_PREFIX}/${encodeURIComponent(companyId)}`;
};

const getHeaders = () => {
  const apiKey = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Nexus-API-Key'] = apiKey;
  return headers;
};

export const isCloudSyncConfigured = (): boolean => Boolean(getBaseUrl());

export const pushCloudSnapshot = async (companyId: string): Promise<void> => {
  const url = buildUrl(companyId);
  if (!url) return;

  const localSnapshot = await exportDeviceSnapshot();
  const payload: CloudSnapshotPayload = {
    ...localSnapshot,
    version: 1,
    companyId,
    updatedAt: new Date().toISOString(),
  };

  await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ snapshot: payload }),
  });
};

export const pullCloudSnapshot = async (companyId: string): Promise<CloudSnapshotPayload | null> => {
  const url = buildUrl(companyId);
  if (!url) return null;

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
