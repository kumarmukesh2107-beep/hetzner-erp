import React, { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { applyCloudSnapshot, isCloudSyncConfigured, pullCloudSnapshot, pushCloudSnapshot } from '../../utils/cloudSync';

const LOCAL_SYNC_EVENT = 'nexus-local-state-changed';
const CLOUD_POLL_INTERVAL_MS = 5000;

const getLastCloudSyncTs = () => {
  const ts = localStorage.getItem('nexus_last_cloud_sync_at');
  return ts ? new Date(ts).getTime() : 0;
};

const getLastLocalChangeTs = () => {
  const ts = localStorage.getItem('nexus_last_local_change_at');
  return ts ? new Date(ts).getTime() : 0;
};

const hasPersistedBusinessData = () => {
  const stateKeys = [
    'nexus_inventory_state_v1',
    'nexus_sales_state_v1',
    'nexus_purchase_state_v1',
    'nexus_contact_state_v1',
    'nexus_customer_state_v1',
    'nexus_accounting_state_v1',
    'nexus_payroll_state_v1',
  ];

  return stateKeys.some((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.length > 0;
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
      }
      return Boolean(parsed);
    } catch {
      return true;
    }
  });
};

const CloudSyncAgent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { activeCompany } = useCompany();

  const companyId = activeCompany?.id;
  const enabled = useMemo(() => isAuthenticated && Boolean(companyId) && isCloudSyncConfigured(), [isAuthenticated, companyId]);
  const applyingRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);
  const localDataFallbackTsRef = useRef(0);


  useEffect(() => {
    localDataFallbackTsRef.current = 0;
  }, [companyId]);

  useEffect(() => {
    if (!enabled || !companyId) return;

    const resolveFallbackLocalTs = (localChangeTs: number): number => {
      if (localChangeTs > 0) {
        localDataFallbackTsRef.current = localChangeTs;
        return localChangeTs;
      }

      if (hasPersistedBusinessData()) {
        if (!localDataFallbackTsRef.current) {
          localDataFallbackTsRef.current = Date.now();
        }
        return localDataFallbackTsRef.current;
      }

      return 0;
    };

    const reconcileWithCloud = async () => {
      try {
        const remote = await pullCloudSnapshot(companyId);
        const remoteTs = new Date(remote?.updatedAt || remote?.exportedAt || 0).getTime();
        const cloudTs = getLastCloudSyncTs();
        const localChangeTs = getLastLocalChangeTs();
        const fallbackLocalTs = resolveFallbackLocalTs(localChangeTs);

        const latestKnownTs = Math.max(cloudTs, fallbackLocalTs);

        if (remote && remoteTs > latestKnownTs) {
          applyingRef.current = true;
          const syncTs = remote.updatedAt || new Date().toISOString();
          await applyCloudSnapshot(remote);
          localStorage.setItem('nexus_last_cloud_sync_at', syncTs);
          localStorage.setItem('nexus_last_local_change_at', syncTs);
          localDataFallbackTsRef.current = new Date(syncTs).getTime();
          window.location.reload();
          return;
        }

        const hasPendingLocalChanges = fallbackLocalTs > cloudTs;
        if (hasPendingLocalChanges && (!remote || fallbackLocalTs >= remoteTs)) {
          await pushCloudSnapshot(companyId);
          const syncTs = new Date().toISOString();
          localStorage.setItem('nexus_last_cloud_sync_at', syncTs);
          localStorage.setItem('nexus_last_local_change_at', syncTs);
          localDataFallbackTsRef.current = new Date(syncTs).getTime();
          return;
        }
      } catch (error) {
        console.warn('Cloud sync reconcile failed:', error);
      } finally {
        applyingRef.current = false;
      }
    };

    const reconcileOnVisibility = () => {
      if (!document.hidden) {
        reconcileWithCloud();
      }
    };

    reconcileWithCloud();
    const poll = window.setInterval(reconcileWithCloud, CLOUD_POLL_INTERVAL_MS);
    window.addEventListener('visibilitychange', reconcileOnVisibility);
    window.addEventListener('focus', reconcileWithCloud);
    window.addEventListener('online', reconcileWithCloud);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener('visibilitychange', reconcileOnVisibility);
      window.removeEventListener('focus', reconcileWithCloud);
      window.removeEventListener('online', reconcileWithCloud);
    };
  }, [enabled, companyId]);

  useEffect(() => {
    if (!enabled || !companyId) return;

    const queuePush = () => {
      if (applyingRef.current) return;
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);

      pushTimerRef.current = window.setTimeout(async () => {
        try {
          await pushCloudSnapshot(companyId);
          const nowIso = new Date().toISOString();
          localStorage.setItem('nexus_last_cloud_sync_at', nowIso);
          localStorage.setItem('nexus_last_local_change_at', nowIso);
          localDataFallbackTsRef.current = new Date(nowIso).getTime();
        } catch (error) {
          console.warn('Cloud sync push failed:', error);
        }
      }, 900);
    };

    window.addEventListener(LOCAL_SYNC_EVENT, queuePush as EventListener);

    return () => {
      window.removeEventListener(LOCAL_SYNC_EVENT, queuePush as EventListener);
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [enabled, companyId]);

  return null;
};

export default CloudSyncAgent;
