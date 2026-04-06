import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getSyncStatus, fullSync, SyncStatus } from '../db/sync';
import { SYNC_INTERVAL_MS } from '../utils/constants';

export function useSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
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
    const status = await getSyncStatus();
    setSyncStatus(status);
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await fullSync();
      await refreshStatus();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshStatus]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      if (online) {
        triggerSync();
      }
    });

    refreshStatus();

    // Periodic sync
    intervalRef.current = setInterval(() => {
      NetInfo.fetch().then((state) => {
        if (state.isConnected && state.isInternetReachable) {
          triggerSync();
        }
      });
    }, SYNC_INTERVAL_MS);

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isOnline, isSyncing, syncStatus, triggerSync, refreshStatus };
}
