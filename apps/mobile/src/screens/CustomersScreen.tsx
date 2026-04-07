import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCustomers, Customer } from '../hooks/useCustomers';

interface Props {
  navigation: any;
}

export default function CustomersScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const { customers, loading, refresh } = useCustomers(search);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const showDetails = (customer: Customer) => {
    const status = (customer as any).approvalStatus;
    const statusLine =
      status === 'PENDING'
        ? 'Status: Aguardando aprovação do administrador'
        : status === 'REJECTED'
        ? `Status: REJEITADO${(customer as any).rejectionReason ? ` — ${(customer as any).rejectionReason}` : ''}`
        : 'Status: Aprovado';

    const lines = [
      `Tipo: ${customer.type === 'INDIVIDUAL' ? 'Pessoa Fisica' : 'Empresa'}`,
      statusLine,
      customer.phone ? `Telefone: ${customer.phone}` : null,
      customer.email ? `Email: ${customer.email}` : null,
      customer.document ? `Documento: ${customer.document}` : null,
      customer.ci ? `CI: ${customer.ci}` : null,
      customer.ruc ? `RUC: ${customer.ruc}` : null,
      `Sincronizado: ${customer.synced ? 'Sim' : 'Pendente'}`,
    ].filter(Boolean).join('\n');
    Alert.alert(customer.name, lines);
  };

  const getTypeLabel = (type: string) => {
    return type === 'INDIVIDUAL' ? 'Pessoa Fisica' : 'Empresa';
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>Clientes</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou telefone..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B5C9A" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={customers.length === 0 ? styles.emptyContainer : styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => showDetails(item)} activeOpacity={0.7}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.customerDetail}>
                      {item.phone || item.email || 'Sem contato'}
                    </Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  {(item as any).approvalStatus === 'PENDING' && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Aguard. aprov.</Text>
                    </View>
                  )}
                  {(item as any).approvalStatus === 'REJECTED' && (
                    <View style={styles.rejectedBadge}>
                      <Text style={styles.rejectedBadgeText}>Rejeitado</Text>
                    </View>
                  )}
                  {!item.synced && (
                    <View style={styles.syncBadge}>
                      <Text style={styles.syncBadgeText}>Pendente</Text>
                    </View>
                  )}
                  <Text style={styles.chevron}>{'>'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Tente outra busca' : 'Adicione seu primeiro cliente'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CustomerForm')}
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
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B5C9A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  customerDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  typeText: {
    fontSize: 11,
    color: '#0B5C9A',
    fontWeight: '500',
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  syncBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  syncBadgeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    color: '#9A3412',
    fontWeight: '700',
  },
  rejectedBadge: {
    backgroundColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  rejectedBadgeText: {
    fontSize: 10,
    color: '#991B1B',
    fontWeight: '700',
  },
  chevron: {
    fontSize: 18,
    color: '#D1D5DB',
    fontWeight: '300',
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
