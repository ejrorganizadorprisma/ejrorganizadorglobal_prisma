import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSync } from '../hooks/useSync';
import { useSales } from '../hooks/useSales';
import { useCustomers } from '../hooks/useCustomers';
import { formatPrice } from '../utils/formatPrice';
import KpiCard from '../components/KpiCard';
import SyncBadge from '../components/SyncBadge';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { isOnline, isSyncing, syncStatus, triggerSync, refreshStatus } = useSync();
  const { sales, getStats } = useSales();
  const { customers } = useCustomers();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
  });

  const pendingCount =
    (syncStatus?.pendingCustomers || 0) +
    (syncStatus?.pendingQuotes || 0) +
    (syncStatus?.pendingSales || 0);

  const loadStats = useCallback(async () => {
    try {
      const s = await getStats();
      if (s) setStats(s);
    } catch {
      // stats unavailable
    }
  }, [getStats]);

  useEffect(() => {
    loadStats();
    refreshStatus();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await triggerSync();
      await loadStats();
      await refreshStatus();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [triggerSync, loadStats, refreshStatus]);

  const firstName = user?.name?.split(' ')[0] || 'Vendedor';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Ola, {firstName}!</Text>
            <Text style={styles.subtitle}>Painel de vendas</Text>
          </View>
          <SyncBadge
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onPress={() => navigation.navigate('Sync')}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0B5C9A']}
            tintColor="#0B5C9A"
          />
        }
      >
        {/* Sync warning banner */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.syncBanner}
            onPress={() => navigation.navigate('Sync')}
            activeOpacity={0.8}
          >
            <Text style={styles.syncBannerText}>
              {pendingCount} {pendingCount === 1 ? 'item aguardando' : 'itens aguardando'} sincronizacao
            </Text>
          </TouchableOpacity>
        )}

        {/* KPI Grid */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Total Vendas"
            value={String(stats.totalSales)}
            color="#0B5C9A"
            icon="📊"
          />
          <View style={styles.kpiSpacer} />
          <KpiCard
            label="Receita"
            value={formatPrice(stats.totalRevenue)}
            color="#10B981"
            icon="💰"
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard
            label="Ticket Medio"
            value={formatPrice(stats.averageTicket)}
            color="#F59E0B"
            icon="🎯"
          />
          <View style={styles.kpiSpacer} />
          <KpiCard
            label="Clientes"
            value={String(customers.length)}
            color="#8B5CF6"
            icon="👥"
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Acoes Rapidas</Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#0B5C9A' }]}
          onPress={() => navigation.navigate('SaleForm')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🛒</Text>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Nova Venda</Text>
            <Text style={styles.actionDesc}>Registrar uma nova venda</Text>
          </View>
          <Text style={styles.actionArrow}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#059669' }]}
          onPress={() => navigation.navigate('QuoteForm')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Novo Orcamento</Text>
            <Text style={styles.actionDesc}>Criar orcamento para cliente</Text>
          </View>
          <Text style={styles.actionArrow}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#7C3AED' }]}
          onPress={() => navigation.navigate('CustomerForm')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>👤</Text>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Novo Cliente</Text>
            <Text style={styles.actionDesc}>Cadastrar novo cliente</Text>
          </View>
          <Text style={styles.actionArrow}>{'>'}</Text>
        </TouchableOpacity>

        {/* Sync button */}
        <TouchableOpacity
          style={[
            styles.syncButton,
            (isSyncing || !isOnline) && styles.syncButtonDisabled,
          ]}
          onPress={triggerSync}
          disabled={isSyncing || !isOnline}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>Sincronizar</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  /* Header */
  header: {
    backgroundColor: '#0B5C9A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  /* Sync warning banner */
  syncBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  syncBannerText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '500',
  },

  /* KPI grid */
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  kpiSpacer: { width: 12 },

  /* Section title */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 12,
  },

  /* Action buttons */
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  actionIcon: { fontSize: 28, marginRight: 14 },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  actionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  actionArrow: { fontSize: 18, color: 'rgba(255,255,255,0.6)' },

  /* Sync button */
  syncButton: {
    backgroundColor: '#0B5C9A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  syncButtonDisabled: { opacity: 0.5 },
  syncButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  bottomSpacer: { height: 24 },
});
