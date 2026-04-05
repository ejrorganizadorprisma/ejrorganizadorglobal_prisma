import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { useProducts, Product } from '../hooks/useProducts';
import { formatPrice } from '../utils/formatPrice';

interface Props {
  visible: boolean;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export default function ProductPicker({ visible, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const { products, loading } = useProducts(search);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Selecionar Produto</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Buscar por nome ou codigo..."
          value={search}
          onChangeText={setSearch}
        />
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => { onSelect(item); onClose(); }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.code}>{item.code} - Estoque: {item.currentStock}</Text>
              </View>
              <Text style={styles.price}>{formatPrice(item.salePrice)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Carregando...' : 'Nenhum produto'}</Text>}
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
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFF', marginHorizontal: 12, marginBottom: 8, borderRadius: 8, elevation: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  code: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700', color: '#0B5C9A' },
  empty: { textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 15 },
});
