import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  getFailedSyncItems,
  retryFailedSyncItems,
  fullSync,
  onSyncComplete,
  FailedSyncItem,
} from '../db/sync';

interface Props {
  // Permite que telas reaproveitem o trigger global de sync (com hook de
  // estado de "isSyncing"). Se nao for passado, o banner usa fullSync direto.
  onTriggerSync?: () => Promise<void> | void;
}

export default function SyncFailureBanner({ onTriggerSync }: Props) {
  const [items, setItems] = useState<FailedSyncItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await getFailedSyncItems();
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Refaz a leitura sempre que um sync termina (poderia ter resolvido
    // alguns itens ou criado novos failures).
    const unsub = onSyncComplete(() => { refresh(); });
    return unsub;
  }, [refresh]);

  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const reset = await retryFailedSyncItems();
      if (reset === 0) {
        Alert.alert('Sincronizacao', 'Nao ha itens com falha para retentar.');
        return;
      }
      if (onTriggerSync) {
        await onTriggerSync();
      } else {
        await fullSync({ force: true, resetAttempts: false });
      }
      await refresh();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao retentar sincronizacao');
    } finally {
      setRetrying(false);
    }
  }, [retrying, onTriggerSync, refresh]);

  if (items.length === 0) return null;

  const entityLabel = (entity: string): string => {
    const map: Record<string, string> = {
      customers: 'Cliente',
      quotes: 'Orcamento',
      sales: 'Venda',
      sales_orders: 'Pedido',
      collections: 'Cobranca',
    };
    return map[entity] || entity;
  };

  const summaryText = items.length === 1
    ? '1 item falhou ao sincronizar'
    : `${items.length} itens falharam ao sincronizar`;

  return (
    <>
      <TouchableOpacity
        style={styles.banner}
        onPress={() => setShowDetails(true)}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerIcon}>!</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{summaryText}</Text>
            <Text style={styles.bannerSub}>Toque para ver detalhes ou retentar</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          disabled={retrying}
          activeOpacity={0.7}
        >
          {retrying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.retryText}>Tentar</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Itens com Falha na Sincronizacao</Text>
            <TouchableOpacity
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 16 }}>
            {items.map((it) => (
              <View key={it.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>
                  {entityLabel(it.entity)} ({it.action})
                </Text>
                <Text style={styles.itemMeta}>ID local: {it.entityId}</Text>
                <Text style={styles.itemMeta}>Tentativas: {it.attempts}</Text>
                <Text style={styles.itemMeta}>Criado em: {it.createdAt}</Text>
                {it.lastError ? (
                  <Text style={styles.itemError} numberOfLines={4}>
                    Ultimo erro: {it.lastError}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerButton, retrying && styles.footerButtonDisabled]}
              onPress={handleRetry}
              disabled={retrying}
              activeOpacity={0.85}
            >
              {retrying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.footerButtonText}>Tentar novamente</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    width: 26,
    height: 26,
    textAlign: 'center',
    lineHeight: 26,
    borderRadius: 13,
    marginRight: 10,
    overflow: 'hidden',
  },
  bannerTitle: {
    color: '#7F1D1D',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerSub: {
    color: '#991B1B',
    fontSize: 11,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#0B5C9A',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemError: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    backgroundColor: '#0B5C9A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerButtonDisabled: {
    opacity: 0.5,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
