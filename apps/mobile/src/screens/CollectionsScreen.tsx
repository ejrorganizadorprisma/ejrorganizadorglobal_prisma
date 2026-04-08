import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCollections, CollectionItem } from '../hooks/useCollections';
import { formatPrice } from '../utils/formatPrice';
import { fullSync, onSyncComplete, getSyncStatus } from '../db/sync';

interface Props {
  navigation: any;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING_APPROVAL: { label: 'Pendente', bg: '#FEF3C7', text: '#92400E' },
  APPROVED: { label: 'Aprovado', bg: '#DBEAFE', text: '#1E40AF' },
  DEPOSITED: { label: 'Depositado', bg: '#D1FAE5', text: '#065F46' },
  REJECTED: { label: 'Rejeitado', bg: '#FEE2E2', text: '#991B1B' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CHEQUE: 'Cheque',
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  TRANSFERENCIA: 'Transferencia',
  OUTRO: 'Outro',
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return 'agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `ha ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `ha ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `ha ${diffD}d`;
}

export default function CollectionsScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const { collections, loading, refresh } = useCollections(search);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          await fullSync(true);
        } catch { /* ignore */ }
        if (!cancelled) await refresh();
      })();
      return () => { cancelled = true; };
    }, [refresh])
  );

  // Re-read local DB whenever a background sync (periodic tick, network
  // recovery, pull-to-refresh from another screen) finishes. This catches
  // the case where the seller is already on this tab when the admin
  // approves/updates data on the web.
  useEffect(() => {
    const loadSync = () => getSyncStatus().then(s => setLastSync(s.lastSync)).catch(() => {});
    loadSync();
    const unsub = onSyncComplete(() => { refresh(); loadSync(); });
    return unsub;
  }, [refresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fullSync(true);
    } catch { /* ignore */ }
    await refresh();
    setRefreshing(false);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, bg: '#F3F4F6', text: '#6B7280' };
  };

  const renderCollection = ({ item }: { item: CollectionItem }) => {
    const statusCfg = getStatusConfig(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.collectionNumber}>
              {item.collectionNumber || 'Pendente sync'}
            </Text>
            {!item.synced && (
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeText}>Pendente</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName || 'Cliente'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {PAYMENT_LABELS[item.paymentMethod] || item.paymentMethod}
            </Text>
            {item.saleNumber && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>Venda {item.saleNumber}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.collectionDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : ''}
          </Text>
          <Text style={styles.totalValue}>{formatPrice(item.amount)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>Cobrancas</Text>
        {lastSync && <Text style={styles.syncHint}>Sincronizado {formatRelativeTime(lastSync)}</Text>}
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B5C9A" />
          <Text style={styles.loadingText}>Carregando cobrancas...</Text>
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={collections.length === 0 ? styles.emptyContainer : styles.listContent}
          renderItem={renderCollection}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{'$'}</Text>
              <Text style={styles.emptyTitle}>Nenhuma cobranca encontrada</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Tente outra busca' : 'Registre sua primeira cobranca'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CollectionForm')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  titleBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  syncHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 10,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  syncBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  syncBadgeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  collectionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B5C9A',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0B5C9A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0B5C9A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '400',
    marginTop: -2,
  },
});
