import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useMyCommissions, MyCommissionEntry, MyMonthlyPoint, EntriesFilters } from '../hooks/useMyCommissions';
import { formatPrice } from '../utils/formatPrice';

type FilterPreset = 'this_month' | 'last_month' | 'three_months' | 'custom';

const PT_BR_SHORT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function monthLabelFromYM(ym: string): string {
  // ym: 'YYYY-MM'
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  const m = parseInt(parts[1], 10);
  if (isNaN(m) || m < 1 || m > 12) return ym;
  return PT_BR_SHORT_MONTHS[m - 1];
}

function getPresetRange(preset: FilterPreset): { startDate: string; endDate: string } | null {
  const now = new Date();
  if (preset === 'this_month') {
    return { startDate: isoDate(startOfMonth(now)), endDate: isoDate(now) };
  }
  if (preset === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { startDate: isoDate(startOfMonth(lastMonth)), endDate: isoDate(endOfMonth(lastMonth)) };
  }
  if (preset === 'three_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { startDate: isoDate(start), endDate: isoDate(now) };
  }
  return null;
}

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

interface SourceTypeMeta {
  label: string;
  color: string;
}

function getSourceTypeMeta(sourceType: 'SALE' | 'COLLECTION'): SourceTypeMeta {
  if (sourceType === 'SALE') {
    return { label: 'Venda', color: '#0B5C9A' };
  }
  return { label: 'Cobranca', color: '#7C3AED' };
}

interface StatusMeta {
  label: string;
  bg: string;
  text: string;
  amountColor: string;
}

function getStatusMeta(status: 'PENDING' | 'SETTLED'): StatusMeta {
  if (status === 'SETTLED') {
    return { label: 'Liquidado', bg: '#D1FAE5', text: '#065F46', amountColor: '#10B981' };
  }
  return { label: 'Pendente', bg: '#FEF3C7', text: '#92400E', amountColor: '#F59E0B' };
}

interface BarChartProps {
  data: MyMonthlyPoint[];
}

function BarChart({ data }: BarChartProps) {
  const maxAmount = useMemo(() => data.reduce((m, p) => (p.amount > m ? p.amount : m), 0), [data]);

  if (!data || data.length === 0 || maxAmount === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Sem dados de comissoes ainda</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.chartRow}>
        {data.map((point, idx) => {
          const heightPx = Math.max(4, (point.amount / maxAmount) * 120);
          return (
            <View key={`${point.month}-${idx}`} style={styles.chartColumn}>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBar, { height: heightPx }]} />
              </View>
              <Text style={styles.chartLabel}>{monthLabelFromYM(point.month)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function MyCommissionsScreen() {
  const {
    summary,
    entries,
    monthly,
    topCustomers,
    loading,
    refresh,
    loadEntries,
  } = useMyCommissions();

  const [refreshing, setRefreshing] = useState(false);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('this_month');
  const [filtering, setFiltering] = useState(false);
  const [valuesHidden, setValuesHidden] = useState(true); // default hidden for privacy

  const maskPrice = (v: number) => valuesHidden ? 'Gs. ••••••' : formatPrice(v);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      const range = getPresetRange(filterPreset);
      if (range) {
        await loadEntries({ ...range, page: 1, limit: 20 });
      } else {
        await loadEntries({ page: 1, limit: 20 });
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadEntries, filterPreset]);

  const handlePresetPress = useCallback(async (preset: FilterPreset) => {
    if (preset === 'custom') {
      showToast('Em breve');
      return;
    }
    setFilterPreset(preset);
    setFiltering(true);
    try {
      const range = getPresetRange(preset);
      const filters: EntriesFilters = { page: 1, limit: 20 };
      if (range) {
        filters.startDate = range.startDate;
        filters.endDate = range.endDate;
      }
      await loadEntries(filters);
    } catch {
      // ignore
    } finally {
      setFiltering(false);
    }
  }, [loadEntries]);

  const deltaIsPositive = summary.deltaPercent >= 0;
  const deltaColor = deltaIsPositive ? '#10B981' : '#EF4444';
  const deltaArrow = deltaIsPositive ? 'cima' : 'baixo';
  const deltaSymbol = deltaIsPositive ? '+' : '';

  if (loading && !refreshing) {
    return (
      <View style={styles.fullLoading}>
        <ActivityIndicator size="large" color="#0B5C9A" />
        <Text style={styles.loadingText}>Carregando comissoes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        {/* TOGGLE VALUES BUTTON */}
        <TouchableOpacity
          onPress={() => setValuesHidden(!valuesHidden)}
          style={styles.toggleButton}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleButtonText}>
            {valuesHidden ? '👁  Mostrar valores' : '🙈  Ocultar valores'}
          </Text>
        </TouchableOpacity>

        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <View style={styles.heroContent}>
            <Text style={styles.heroIcon}>💰</Text>
            <Text style={styles.heroLabel}>Este mes</Text>
            <Text style={styles.heroAmount}>{maskPrice(summary.currentMonth)}</Text>
            <View style={styles.heroDeltaRow}>
              <Text style={[styles.heroDeltaText, { color: deltaColor }]}>
                {deltaIsPositive ? '↑' : '↓'} {deltaSymbol}{summary.deltaPercent.toFixed(0)}%
              </Text>
              <Text style={styles.heroDeltaSub}> vs mes passado ({deltaArrow})</Text>
            </View>
          </View>
        </View>

        {/* KPI CARDS */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderTopColor: '#F59E0B' }]}>
            <Text style={styles.kpiLabel}>A receber</Text>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{maskPrice(summary.totalPending)}</Text>
          </View>
          <View style={styles.kpiSpacer} />
          <View style={[styles.kpiCard, { borderTopColor: '#10B981' }]}>
            <Text style={styles.kpiLabel}>Ja recebido</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>{maskPrice(summary.totalSettled)}</Text>
          </View>
        </View>

        {/* MONTHLY CHART */}
        <Text style={styles.sectionTitle}>📊 Ultimos 6 meses</Text>
        <View style={styles.card}>
          <BarChart data={monthly} />
        </View>

        {/* TOP CUSTOMERS */}
        <Text style={styles.sectionTitle}>🏆 Top clientes</Text>
        <View style={styles.card}>
          {topCustomers.length === 0 ? (
            <Text style={styles.emptyMutedText}>Sem clientes ainda</Text>
          ) : (
            topCustomers.map((c) => (
              <View key={c.customerId} style={styles.customerRow}>
                <Text style={styles.customerName} numberOfLines={1}>{c.customerName || 'Cliente'}</Text>
                <Text style={styles.customerAmount}>{maskPrice(c.totalAmount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* FILTER CHIPS */}
        <Text style={styles.sectionTitle}>Filtros</Text>
        <View style={styles.chipsRow}>
          <Chip
            label="Este mes"
            active={filterPreset === 'this_month'}
            onPress={() => handlePresetPress('this_month')}
          />
          <Chip
            label="Mes passado"
            active={filterPreset === 'last_month'}
            onPress={() => handlePresetPress('last_month')}
          />
          <Chip
            label="3 meses"
            active={filterPreset === 'three_months'}
            onPress={() => handlePresetPress('three_months')}
          />
        </View>

        {/* DETAIL ENTRIES */}
        <View style={styles.detailHeaderRow}>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          {filtering && <ActivityIndicator size="small" color="#0B5C9A" />}
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Ainda nenhuma comissao neste periodo. Aprovar cobrancas e fechar vendas gera comissoes automaticamente.
            </Text>
          </View>
        ) : (
          entries.map((entry) => <EntryCard key={entry.id} entry={entry} valuesHidden={valuesHidden} />)
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface EntryCardProps {
  entry: MyCommissionEntry;
  valuesHidden: boolean;
}

function EntryCard({ entry, valuesHidden }: EntryCardProps) {
  const sourceMeta = getSourceTypeMeta(entry.sourceType);
  const statusMeta = getStatusMeta(entry.status);
  const ratePct = (entry.commissionRate * 100).toFixed(1).replace(/\.0$/, '');
  const shownAmount = valuesHidden ? 'Gs. ••••••' : formatPrice(entry.commissionAmount);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeaderRow}>
        <View style={styles.entryHeaderLeft}>
          <Text style={styles.entryCustomer} numberOfLines={1}>
            {entry.customerName || 'Cliente'}
          </Text>
          <Text style={styles.entryNumber}>{entry.sourceNumber}</Text>
          <View style={styles.entryBadgeRow}>
            <View style={[styles.entryTypeBadge, { backgroundColor: sourceMeta.color }]}>
              <Text style={styles.entryTypeBadgeText}>{sourceMeta.label} • {ratePct}%</Text>
            </View>
            <View style={[styles.entryStatusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.entryStatusText, { color: statusMeta.text }]}>
                {statusMeta.label} {entry.status === 'PENDING' ? '🟡' : '✅'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.entryFooter}>
        <Text style={[styles.entryAmount, { color: statusMeta.amountColor }]}>
          {shownAmount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  fullLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  /* HERO */
  heroCard: {
    backgroundColor: '#0B5C9A',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexDirection: 'row',
  },
  heroAccent: {
    width: 4,
    backgroundColor: '#F59E0B',
  },
  heroContent: {
    flex: 1,
    padding: 18,
  },
  heroIcon: {
    fontSize: 22,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
  },
  heroDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  heroDeltaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroDeltaSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  /* KPIs */
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  kpiSpacer: { width: 12 },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },

  /* Generic card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 10,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* Chart */
  chartWrapper: {
    paddingTop: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  chartBarTrack: {
    width: '100%',
    height: 124,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '70%',
    backgroundColor: '#0B5C9A',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  chartEmpty: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  /* Top customers */
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginRight: 12,
  },
  customerAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B5C9A',
  },
  emptyMutedText: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingVertical: 8,
    textAlign: 'center',
  },

  /* Filter chips */
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#0B5C9A',
    borderColor: '#0B5C9A',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  /* Entry card */
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryHeaderLeft: {
    flex: 1,
  },
  entryCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  entryNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  entryBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  entryTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  entryTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  entryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  entryStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  entryFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  entryAmount: {
    fontSize: 17,
    fontWeight: '800',
  },

  /* Empty state */
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },

  bottomSpacer: { height: 24 },
});
