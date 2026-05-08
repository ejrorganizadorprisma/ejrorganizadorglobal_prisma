import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCommissionForecast, CommissionForecastByOrder } from '../hooks/useCommissionForecast';
import { formatPrice } from '../utils/formatPrice';

export default function CommissionForecastScreen() {
  const { data, loading, error, refresh } = useCommissionForecast();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const renderItem = useCallback(({ item }: { item: CommissionForecastByOrder }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowOrder}>{item.orderNumber || item.orderId}</Text>
        <Text style={styles.rowSubtotal}>Subtotal: {formatPrice(item.subtotal)}</Text>
      </View>
      <Text style={styles.rowAmount}>{formatPrice(item.forecastedAmount)}</Text>
    </View>
  ), []);

  if (loading && data.byOrder.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B5C9A" />
        <Text style={styles.centerText}>Calculando previsao...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Comissao prevista</Text>
        <Text style={styles.headerAmount}>{formatPrice(data.forecastedCommission)}</Text>
        <Text style={styles.headerSub}>
          {data.pendingOrders} {data.pendingOrders === 1 ? 'pedido pendente' : 'pedidos pendentes'} ·
          {' '}Subtotal {formatPrice(data.totalSubtotal)}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {data.byOrder.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhum pedido pendente</Text>
          <Text style={styles.emptyText}>
            Nao ha pedidos em PENDING ou APPROVED gerando comissao prevista no momento.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data.byOrder}
          keyExtractor={(it) => it.orderId}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0B5C9A']}
              tintColor="#0B5C9A"
            />
          }
          contentContainerStyle={styles.listContent}
          ListFooterComponent={(
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>Total previsto</Text>
              <Text style={styles.footerAmount}>{formatPrice(data.forecastedCommission)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  centerText: { color: '#6B7280', marginTop: 12 },
  header: {
    backgroundColor: '#0B5C9A',
    padding: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  headerAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 6,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    margin: 12,
    padding: 10,
    borderRadius: 10,
  },
  errorText: { color: '#B91C1C', fontSize: 12, textAlign: 'center' },
  listContent: { padding: 12, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    alignItems: 'center',
  },
  rowOrder: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  rowSubtotal: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  empty: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: '#0B5C9A',
  },
  footerLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  footerAmount: { fontSize: 18, fontWeight: '800', color: '#0B5C9A' },
});
