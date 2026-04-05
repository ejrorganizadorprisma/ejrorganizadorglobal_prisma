import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, FlatList, StyleSheet } from 'react-native';
import { useSales, SaleItem } from '../hooks/useSales';
import { Customer } from '../hooks/useCustomers';
import { Product } from '../hooks/useProducts';
import CustomerPicker from '../components/CustomerPicker';
import ProductPicker from '../components/ProductPicker';
import { formatPrice } from '../utils/formatPrice';

interface Props {
  navigation: any;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartao de Credito' },
  { value: 'DEBIT_CARD', label: 'Cartao de Debito' },
  { value: 'BANK_TRANSFER', label: 'Transferencia Bancaria' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'PROMISSORY', label: 'Promissoria' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OTHER', label: 'Outro' },
];

export default function SaleFormScreen({ navigation }: Props) {
  const { createSale } = useSales();
  const [saving, setSaving] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<(SaleItem & { key: string })[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [installments, setInstallments] = useState('1');
  const [saleDate, setSaleDate] = useState(new Date().toLocaleDateString('pt-BR'));
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');

  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountValue = parseInt(discount || '0', 10);
  const total = subtotal - discountValue;

  const handleAddProduct = (product: Product) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(prev =>
        prev.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems(prev => [
        ...prev,
        {
          key: `${Date.now()}`,
          itemType: 'PRODUCT' as const,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.salePrice,
        },
      ]);
    }
  };

  const updateQuantity = (key: string, qty: string) => {
    const num = parseInt(qty, 10);
    if (isNaN(num) || num < 0) return;
    if (num === 0) {
      setItems(prev => prev.filter(i => i.key !== key));
    } else {
      setItems(prev => prev.map(i => (i.key === key ? { ...i, quantity: num } : i)));
    }
  };

  const removeItem = (key: string) => {
    setItems(prev => prev.filter(i => i.key !== key));
  };

  const handleSave = async () => {
    if (!customer) {
      Alert.alert('Erro', 'Selecione um cliente.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Erro', 'Adicione ao menos um produto.');
      return;
    }

    // Parse date DD/MM/YYYY to ISO
    const dateParts = saleDate.trim().split('/');
    let isoDate = saleDate.trim();
    if (dateParts.length === 3) {
      isoDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
    }

    setSaving(true);
    try {
      await createSale({
        customerId: customer.id,
        items: items.map(({ key, ...rest }) => rest),
        discount: discountValue,
        paymentMethod,
        installments: parseInt(installments, 10) || 1,
        saleDate: isoDate,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Sucesso', 'Venda registrada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel salvar a venda.');
    } finally {
      setSaving(false);
    }
  };

  const selectedPaymentLabel = PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label || paymentMethod;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Customer */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Cliente *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCustomerPicker(true)}
          >
            <Text style={customer ? styles.pickerValue : styles.pickerPlaceholder}>
              {customer ? customer.name : 'Selecionar cliente...'}
            </Text>
            <Text style={styles.pickerArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Items */}
        <View style={styles.fieldGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Itens *</Text>
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => setShowProductPicker(true)}
            >
              <Text style={styles.addItemText}>+ Adicionar Produto</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={styles.emptyItemsText}>Nenhum produto adicionado</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.key} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.productName || item.serviceName}</Text>
                  <Text style={styles.itemPrice}>
                    {formatPrice(item.unitPrice)} x {item.quantity} = {formatPrice(item.unitPrice * item.quantity)}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TextInput
                    style={styles.qtyInput}
                    value={String(item.quantity)}
                    onChangeText={(val) => updateQuantity(item.key, val)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={() => removeItem(item.key)} style={styles.removeButton}>
                    <Text style={styles.removeText}>X</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Forma de Pagamento *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPaymentPicker(true)}
          >
            <Text style={styles.pickerValue}>{selectedPaymentLabel}</Text>
            <Text style={styles.pickerArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Installments */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Parcelas</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor="#9CA3AF"
            value={installments}
            onChangeText={setInstallments}
            keyboardType="numeric"
          />
        </View>

        {/* Sale Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Data da Venda</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#9CA3AF"
            value={saleDate}
            onChangeText={setSaleDate}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Discount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Desconto (Gs.)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Observacoes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Observacoes adicionais..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalAmount}>{formatPrice(subtotal)}</Text>
          </View>
          {discountValue > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Desconto</Text>
              <Text style={[styles.totalAmount, styles.discountAmount]}>-{formatPrice(discountValue)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalAmount}>{formatPrice(total)}</Text>
          </View>
          {parseInt(installments, 10) > 1 && total > 0 && (
            <View style={styles.installmentInfo}>
              <Text style={styles.installmentText}>
                {installments}x de {formatPrice(Math.round(total / parseInt(installments, 10)))}
              </Text>
            </View>
          )}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Registrar Venda</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Customer Picker */}
      <CustomerPicker
        visible={showCustomerPicker}
        onSelect={(c) => setCustomer(c)}
        onClose={() => setShowCustomerPicker(false)}
      />

      {/* Product Picker */}
      <ProductPicker
        visible={showProductPicker}
        onSelect={handleAddProduct}
        onClose={() => setShowProductPicker(false)}
      />

      {/* Payment Method Picker Modal */}
      <Modal visible={showPaymentPicker} animationType="slide" transparent onRequestClose={() => setShowPaymentPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forma de Pagamento</Text>
              <TouchableOpacity onPress={() => setShowPaymentPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={PAYMENT_METHODS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === item.value && styles.paymentOptionActive,
                  ]}
                  onPress={() => {
                    setPaymentMethod(item.value);
                    setShowPaymentPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === item.value && styles.paymentOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {paymentMethod === item.value && (
                    <Text style={styles.paymentCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  form: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  pickerArrow: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  addItemButton: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B5C9A',
  },
  emptyItems: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyItemsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  itemRow: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyInput: {
    width: 50,
    textAlign: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  totalsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  discountAmount: {
    color: '#EF4444',
  },
  grandTotalRow: {
    marginBottom: 0,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B5C9A',
  },
  installmentInfo: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  installmentText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Payment Method Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modalClose: {
    fontSize: 22,
    color: '#6B7280',
    paddingHorizontal: 4,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentOptionActive: {
    backgroundColor: '#EBF5FF',
  },
  paymentOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  paymentOptionTextActive: {
    color: '#0B5C9A',
    fontWeight: '600',
  },
  paymentCheck: {
    fontSize: 18,
    color: '#0B5C9A',
    fontWeight: '700',
  },
});
