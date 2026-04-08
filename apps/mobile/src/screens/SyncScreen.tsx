import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSync } from '../hooks/useSync';
import { getSyncStatus, fullSync } from '../db/sync';
import { getBaseUrl, clearBaseUrlCache } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../db/migrations';

const STORAGE_KEY_URL = '@ejr_api_url';

interface SyncLogEntry {
  id: number;
  action: string;
  status: string;
  message: string;
  created_at: string;
}

export default function SyncScreen() {
  const { isOnline, isSyncing, syncStatus, triggerSync, refreshStatus } = useSync();

  const [editingUrl, setEditingUrl] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const pendingCustomers = syncStatus?.pendingCustomers || 0;
  const pendingQuotes = syncStatus?.pendingQuotes || 0;
  const pendingSales = syncStatus?.pendingSales || 0;
  const pendingCollections = syncStatus?.pendingCollections || 0;
  const totalPending = pendingCustomers + pendingQuotes + pendingSales + pendingCollections;
  const lastSync = syncStatus?.lastSync || null;

  const loadData = useCallback(async () => {
    try {
      const url = await getBaseUrl();
      setCurrentUrl(url);
      setNewUrl(url);
    } catch {
      // fallback
    }

    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<SyncLogEntry>(
        'SELECT * FROM sync_log ORDER BY rowid DESC LIMIT 10'
      );
      setSyncLog(rows);
    } catch {
      // sync_log may not exist yet
      setSyncLog([]);
    }

    await refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      // Botão manual: reseta contador de tentativas para reprocessar itens
      // que bateram o limite de 5 tentativas em sincs anteriores.
      await triggerSync({ resetAttempts: true });
      await loadData();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  }, [triggerSync, loadData]);

  const handleSaveUrl = useCallback(async () => {
    const trimmed = newUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    await AsyncStorage.setItem(STORAGE_KEY_URL, trimmed);
    clearBaseUrlCache();
    setCurrentUrl(trimmed);
    setEditingUrl(false);
  }, [newUrl]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Nunca';
    try {
      const d = new Date(ts);
      return d.toLocaleString('pt-BR');
    } catch {
      return ts;
    }
  };

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'synced':
        return '#10B981';
      case 'error':
      case 'failed':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const isCurrentlySyncing = isSyncing || syncing;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#0B5C9A']}
          tintColor="#0B5C9A"
        />
      }
    >
      {/* Connection status */}
      <View style={styles.statusCard}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isOnline ? '#D1FAE5' : '#FEE2E2' },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? '#10B981' : '#EF4444' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isOnline ? '#065F46' : '#991B1B' },
            ]}
          >
            {isOnline ? 'Conectado ao servidor' : 'Sem conexao com o servidor'}
          </Text>
        </View>
        <Text style={styles.lastSyncLabel}>
          Ultima sincronizacao: {formatTimestamp(lastSync)}
        </Text>
      </View>

      {/* Pending items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Itens Pendentes</Text>
        <View style={styles.pendingRow}>
          <Text style={styles.pendingLabel}>Clientes pendentes</Text>
          <Text style={[styles.pendingValue, pendingCustomers > 0 && styles.pendingActive]}>
            {pendingCustomers}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.pendingRow}>
          <Text style={styles.pendingLabel}>Orcamentos pendentes</Text>
          <Text style={[styles.pendingValue, pendingQuotes > 0 && styles.pendingActive]}>
            {pendingQuotes}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.pendingRow}>
          <Text style={styles.pendingLabel}>Vendas pendentes</Text>
          <Text style={[styles.pendingValue, pendingSales > 0 && styles.pendingActive]}>
            {pendingSales}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.pendingRow}>
          <Text style={styles.pendingLabel}>Cobrancas pendentes</Text>
          <Text style={[styles.pendingValue, pendingCollections > 0 && styles.pendingActive]}>
            {pendingCollections}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.pendingRow}>
          <Text style={[styles.pendingLabel, { fontWeight: '600' }]}>Total</Text>
          <View
            style={[
              styles.totalBadge,
              { backgroundColor: totalPending > 0 ? '#FEF3C7' : '#D1FAE5' },
            ]}
          >
            <Text
              style={[
                styles.totalBadgeText,
                { color: totalPending > 0 ? '#92400E' : '#065F46' },
              ]}
            >
              {totalPending}
            </Text>
          </View>
        </View>
      </View>

      {/* Sync button */}
      <TouchableOpacity
        style={[
          styles.syncButton,
          (isCurrentlySyncing || !isOnline) && styles.syncButtonDisabled,
        ]}
        onPress={handleSync}
        disabled={isCurrentlySyncing || !isOnline}
        activeOpacity={0.8}
      >
        {isCurrentlySyncing ? (
          <View style={styles.syncButtonInner}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={[styles.syncButtonText, { marginLeft: 10 }]}>
              Sincronizando...
            </Text>
          </View>
        ) : (
          <Text style={styles.syncButtonText}>Sincronizar Agora</Text>
        )}
      </TouchableOpacity>

      {/* Server URL */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Servidor</Text>
        <Text style={styles.urlLabel}>URL atual:</Text>
        <Text style={styles.urlValue} numberOfLines={2}>
          {currentUrl}
        </Text>

        {editingUrl ? (
          <View style={styles.urlEditSection}>
            <TextInput
              style={styles.urlInput}
              value={newUrl}
              onChangeText={setNewUrl}
              placeholder="https://..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.urlButtonRow}>
              <TouchableOpacity
                style={styles.urlCancelButton}
                onPress={() => {
                  setEditingUrl(false);
                  setNewUrl(currentUrl);
                }}
              >
                <Text style={styles.urlCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.urlSaveButton}
                onPress={handleSaveUrl}
              >
                <Text style={styles.urlSaveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.urlEditButton}
            onPress={() => setEditingUrl(true)}
          >
            <Text style={styles.urlEditButtonText}>Alterar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sync log */}
      {syncLog.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log de Sincronizacao</Text>
          {syncLog.map((entry, index) => (
            <View key={entry.id || index}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.logEntry}>
                <View style={styles.logLeft}>
                  <View style={styles.logHeader}>
                    <View
                      style={[
                        styles.logStatusDot,
                        { backgroundColor: statusColor(entry.status) },
                      ]}
                    />
                    <Text style={styles.logEntity}>
                      {entry.action}
                    </Text>
                  </View>
                  {entry.message && (
                    <Text style={entry.status === 'ERROR' ? styles.logError : styles.logMessage} numberOfLines={3}>
                      {entry.message}
                    </Text>
                  )}
                </View>
                <Text style={styles.logTime}>
                  {formatTimestamp(entry.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },

  /* Status card */
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  lastSyncLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  /* Generic card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },

  /* Pending items */
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  pendingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  pendingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  pendingActive: {
    color: '#F59E0B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* Sync button */
  syncButton: {
    backgroundColor: '#0B5C9A',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#0B5C9A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  /* Server URL */
  urlLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  urlValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  urlEditButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  urlEditButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  urlEditSection: {
    marginTop: 12,
  },
  urlInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  urlButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  urlCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  urlCancelText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  urlSaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#0B5C9A',
  },
  urlSaveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* Sync log */
  logEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  logLeft: {
    flex: 1,
    marginRight: 10,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  logEntity: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  logError: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 16,
  },
  logMessage: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 16,
  },
  logTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  bottomSpacer: { height: 24 },
});
