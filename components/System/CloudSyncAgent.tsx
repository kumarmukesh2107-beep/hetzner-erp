import React, { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { applyCloudSnapshot, isCloudSyncConfigured, pullCloudSnapshot, pushCloudSnapshot } from '../../utils/cloudSync';

const LOCAL_SYNC_EVENT = 'nexus-local-state-changed';

const getLocalTs = () => {
  const ts = localStorage.getItem('nexus_last_cloud_sync_at');
  return ts ? new Date(ts).getTime() : 0;
};

const CloudSyncAgent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { activeCompany } = useCompany();

  const companyId = activeCompany?.id;
  const enabled = useMemo(() => isAuthenticated && Boolean(companyId) && isCloudSyncConfigured(), [isAuthenticated, companyId]);
  const applyingRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !companyId) return;

    const pullOnce = async () => {
      try {
        const remote = await pullCloudSnapshot(companyId);
        if (!remote) return;

        const remoteTs = new Date(remote.updatedAt || remote.exportedAt || 0).getTime();
        const localTs = getLocalTs();

        if (remoteTs > localTs) {
          applyingRef.current = true;
          await applyCloudSnapshot(remote);
          localStorage.setItem('nexus_last_cloud_sync_at', remote.updatedAt || new Date().toISOString());
          window.location.reload();
        }
      } catch (error) {
        console.warn('Cloud sync pull failed:', error);
      } finally {
        applyingRef.current = false;
      }
    };

    pullOnce();
    const poll = window.setInterval(pullOnce, 25000);
    return () => window.clearInterval(poll);
  }, [enabled, companyId]);

  useEffect(() => {
    if (!enabled || !companyId) return;

    const queuePush = () => {
      if (applyingRef.current) return;
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);

      pushTimerRef.current = window.setTimeout(async () => {
        try {
          await pushCloudSnapshot(companyId);
          localStorage.setItem('nexus_last_cloud_sync_at', new Date().toISOString());
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
