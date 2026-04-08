import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getSyncStatus, fullSync, SyncStatus } from '../db/sync';
import { SYNC_INTERVAL_MS } from '../utils/constants';

export function useSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingCustomers: 0,
    pendingQuotes: 0,
    pendingSales: 0,
    pendingCollections: 0,
    totalPending: 0,
    lastSync: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch {
      // ignore
    }
  }, []);

  const triggerSync = useCallback(async (opts: { resetAttempts?: boolean } = {}) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await fullSync({ resetAttempts: opts.resetAttempts });
      await refreshStatus();
    } catch {
      // ignore
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshStatus]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      if (online && !isSyncingRef.current) {
        // auto-sync on reconnect: mantém limite de 5 tentativas
        triggerSync();
      }
    });

    refreshStatus();

    intervalRef.current = setInterval(() => {
      if (isSyncingRef.current) return;
      NetInfo.fetch().then((state) => {
        if (state.isConnected && state.isInternetReachable) {
          // auto-sync a cada 30s: mantém limite de 5 tentativas
          triggerSync();
        }
      });
    }, SYNC_INTERVAL_MS);

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [triggerSync, refreshStatus]);

  return { isOnline, isSyncing, syncStatus, triggerSync, refreshStatus };
}
