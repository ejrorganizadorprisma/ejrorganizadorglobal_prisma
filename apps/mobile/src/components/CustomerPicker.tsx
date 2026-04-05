import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { useCustomers, Customer } from '../hooks/useCustomers';

interface Props {
  visible: boolean;
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

export default function CustomerPicker({ visible, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const { customers, loading } = useCustomers(search);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Selecionar Cliente</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChangeText={setSearch}
        />
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => { onSelect(item); onClose(); }}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.detail}>{item.phone || item.email || item.type}</Text>
              </View>
              {!item.synced && <View style={styles.badge}><Text style={styles.badgeText}>Pendente</Text></View>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Carregando...' : 'Nenhum cliente'}</Text>}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#0B5C9A' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  close: { fontSize: 24, color: '#FFF', paddingHorizontal: 8 },
  search: { margin: 12, padding: 12, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 15 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#FFF', marginHorizontal: 12, marginBottom: 8, borderRadius: 8, elevation: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  detail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, color: '#92400E', fontWeight: '600' },
  empty: { textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 15 },
});
