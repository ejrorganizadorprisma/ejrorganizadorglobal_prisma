import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCollections } from '../hooks/useCollections';
import { getDatabase } from '../db/migrations';
import { captureLocation, LocationResult } from '../utils/captureLocation';
import { formatPrice } from '../utils/formatPrice';
import { formatGuarani, onlyDigits } from '../utils/masks';

interface Props {
  navigation: any;
}

interface SaleOption {
  id: string;
  saleNumber?: string;
  customerId: string;
  customerName?: string;
  total: number;
  collectedAmount: number;
  remaining: number;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Outro' },
];

export default function CollectionFormScreen({ navigation }: Props) {
  const { createCollection } = useCollections();
  const [saving, setSaving] = useState(false);

  // Sale selection
  const [sales, setSales] = useState<SaleOption[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleOption | null>(null);
  const [showSalePicker, setShowSalePicker] = useState(false);
  const [saleSearch, setSaleSearch] = useState('');

  // Form fields
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [checkNumber, setCheckNumber] = useState('');
  const [checkBank, setCheckBank] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // GPS
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'captured' | 'unavailable'>('idle');

  // Load sales from local SQLite
  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const db = await getDatabase();
    // Load all sales
    const saleRows = await db.getAllAsync<{ id: string; data: string }>(
      'SELECT id, data FROM sales ORDER BY rowid DESC'
    );
    // Load existing collections to calculate already collected amounts
    const collectionRows = await db.getAllAsync<{ id: string; data: string }>(
      'SELECT id, data FROM collections'
    );

    const collectedBySale: Record<string, number> = {};
    for (const row of collectionRows) {
      try {
        const col = JSON.parse(row.data);
        if (col.saleId && col.status !== 'REJECTED') {
          collectedBySale[col.saleId] = (collectedBySale[col.saleId] || 0) + (col.amount || 0);
        }
      } catch { /* ignore */ }
    }

    const options: SaleOption[] = [];
    for (const row of saleRows) {
      try {
        const sale = JSON.parse(row.data);
        if (sale.status === 'CANCELLED') continue;
        const total = sale.total || 0;
        const collected = collectedBySale[sale.id] || 0;
        const remaining = total - collected;
        if (remaining <= 0) continue; // Fully paid
        options.push({
          id: sale.id,
          saleNumber: sale.saleNumber,
          customerId: sale.customerId,
          customerName: sale.customerName,
          total,
          collectedAmount: collected,
          remaining,
        });
      } catch { /* ignore */ }
    }
    setSales(options);
  };

  const handleSelectSale = (sale: SaleOption) => {
    setSelectedSale(sale);
    setShowSalePicker(false);
    setSaleSearch('');
  };

  const handleTakePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limite', 'Maximo de 3 fotos por cobranca.');
      return;
    }

    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permissao', 'Permissao de camera necessaria para tirar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos(prev => [...prev, base64Uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedSale) {
      Alert.alert('Erro', 'Selecione uma venda.');
      return;
    }

    const amountValue = parseInt(amount || '0', 10);
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Erro', 'Informe o valor da cobranca.');
      return;
    }

    if (amountValue > selectedSale.remaining) {
      Alert.alert('Erro', `O valor nao pode exceder o saldo restante de ${formatPrice(selectedSale.remaining)}.`);
      return;
    }

    if (paymentMethod === 'CHECK') {
      if (!checkNumber.trim()) {
        Alert.alert('Erro', 'Informe o numero do cheque.');
        return;
      }
      if (!checkBank.trim()) {
        Alert.alert('Erro', 'Informe o banco do cheque.');
        return;
      }
    }

    setSaving(true);

    // Capture GPS
    setGpsStatus('capturing');
    const loc = await captureLocation();
    if (loc) {
      setLocation(loc);
      setGpsStatus('captured');
    } else {
      setGpsStatus('unavailable');
    }

    try {
      // Parse check date if provided
      let isoCheckDate: string | undefined;
      if (checkDate.trim()) {
        const dateParts = checkDate.trim().split('/');
        if (dateParts.length === 3) {
          isoCheckDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        } else {
          isoCheckDate = checkDate.trim();
        }
      }

      await createCollection({
        saleId: selectedSale.id,
        saleNumber: selectedSale.saleNumber,
        customerId: selectedSale.customerId,
        customerName: selectedSale.customerName,
        amount: amountValue,
        paymentMethod,
        checkNumber: paymentMethod === 'CHECK' ? checkNumber.trim() : undefined,
        checkBank: paymentMethod === 'CHECK' ? checkBank.trim() : undefined,
        checkDate: paymentMethod === 'CHECK' ? isoCheckDate : undefined,
        photoUrls: photos.length > 0 ? photos : undefined,
        notes: notes.trim() || undefined,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });

      Alert.alert('Sucesso', 'Cobranca registrada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Erro ao registrar cobranca',
        error?.message || 'Nao foi possivel salvar. Verifique sua conexao e tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedPaymentLabel = PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label || paymentMethod;

  const filteredSales = saleSearch
    ? sales.filter(s =>
        (s.saleNumber || '').toLowerCase().includes(saleSearch.toLowerCase()) ||
        (s.customerName || '').toLowerCase().includes(saleSearch.toLowerCase())
      )
    : sales;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Sale Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Venda *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowSalePicker(true)}
          >
            <Text style={selectedSale ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedSale
                ? `${selectedSale.saleNumber || `#${selectedSale.id.slice(-6)}`} - ${selectedSale.customerName || 'Cliente'}`
                : 'Selecionar venda...'}
            </Text>
            <Text style={styles.pickerArrow}>{'>'}</Text>
          </TouchableOpacity>
          {selectedSale && (
            <View style={styles.saleInfo}>
              <Text style={styles.saleInfoText}>
                Total: {formatPrice(selectedSale.total)} | Cobrado: {formatPrice(selectedSale.collectedAmount)} | Restante: {formatPrice(selectedSale.remaining)}
              </Text>
            </View>
          )}
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Valor (Gs.) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            value={amount ? formatGuarani(amount) : ''}
            onChangeText={(t) => setAmount(onlyDigits(t))}
            keyboardType="numeric"
          />
          {selectedSale && amount && parseInt(amount, 10) > 0 && (
            <Text style={styles.helperText}>
              {formatPrice(parseInt(amount, 10))}
              {parseInt(amount, 10) > selectedSale.remaining && (
                ' - Excede o saldo restante!'
              )}
            </Text>
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

        {/* Check Fields */}
        {paymentMethod === 'CHECK' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Numero do Cheque *</Text>
              <TextInput
                style={styles.input}
                placeholder="Numero do cheque"
                placeholderTextColor="#9CA3AF"
                value={checkNumber}
                onChangeText={setCheckNumber}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Banco *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do banco"
                placeholderTextColor="#9CA3AF"
                value={checkBank}
                onChangeText={setCheckBank}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Data do Cheque</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#9CA3AF"
                value={checkDate}
                onChangeText={setCheckDate}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </>
        )}

        {/* Photos */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Fotos ({photos.length}/3)</Text>
          <View style={styles.photoRow}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.photoRemoveText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <TouchableOpacity style={styles.photoAddButton} onPress={handleTakePhoto}>
                <Text style={styles.photoAddIcon}>+</Text>
                <Text style={styles.photoAddText}>Tirar Foto</Text>
              </TouchableOpacity>
            )}
          </View>
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

        {/* GPS Status */}
        <View style={styles.gpsContainer}>
          <View style={[styles.gpsDot, {
            backgroundColor:
              gpsStatus === 'captured' ? '#10B981' :
              gpsStatus === 'unavailable' ? '#EF4444' :
              gpsStatus === 'capturing' ? '#F59E0B' : '#9CA3AF'
          }]} />
          <Text style={styles.gpsText}>
            {gpsStatus === 'captured' ? 'GPS capturado' :
             gpsStatus === 'unavailable' ? 'GPS indisponivel' :
             gpsStatus === 'capturing' ? 'Capturando GPS...' :
             'GPS sera capturado ao salvar'}
          </Text>
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
            <Text style={styles.saveButtonText}>Registrar Cobranca</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sale Picker Modal */}
      <Modal visible={showSalePicker} animationType="slide" transparent onRequestClose={() => setShowSalePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Venda</Text>
              <TouchableOpacity onPress={() => { setShowSalePicker(false); setSaleSearch(''); }}>
                <Text style={styles.modalClose}>X</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar por numero ou cliente..."
                placeholderTextColor="#9CA3AF"
                value={saleSearch}
                onChangeText={setSaleSearch}
              />
            </View>
            <FlatList
              data={filteredSales}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.saleOption}
                  onPress={() => handleSelectSale(item)}
                >
                  <View style={styles.saleOptionInfo}>
                    <Text style={styles.saleOptionNumber}>
                      {item.saleNumber || `Venda #${item.id.slice(-6)}`}
                    </Text>
                    <Text style={styles.saleOptionCustomer} numberOfLines={1}>
                      {item.customerName || 'Cliente'}
                    </Text>
                  </View>
                  <View style={styles.saleOptionAmounts}>
                    <Text style={styles.saleOptionTotal}>Total: {formatPrice(item.total)}</Text>
                    <Text style={styles.saleOptionRemaining}>Restante: {formatPrice(item.remaining)}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyModal}>
                  <Text style={styles.emptyModalText}>Nenhuma venda com saldo encontrada</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Payment Method Picker Modal */}
      <Modal visible={showPaymentPicker} animationType="slide" transparent onRequestClose={() => setShowPaymentPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forma de Pagamento</Text>
              <TouchableOpacity onPress={() => setShowPaymentPicker(false)}>
                <Text style={styles.modalClose}>X</Text>
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
                    <Text style={styles.paymentCheck}>{'✓'}</Text>
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
    flex: 1,
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
    flex: 1,
  },
  pickerArrow: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  saleInfo: {
    backgroundColor: '#EBF5FF',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  saleInfoText: {
    fontSize: 12,
    color: '#0B5C9A',
    fontWeight: '500',
  },
  // Photos
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: 80,
    height: 80,
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239,68,68,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  photoAddButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  photoAddIcon: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  photoAddText: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // GPS
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  gpsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Save button
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
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
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
    fontSize: 18,
    color: '#6B7280',
    paddingHorizontal: 4,
    fontWeight: '600',
  },
  modalSearch: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalSearchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
  },
  // Sale options
  saleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleOptionInfo: {
    flex: 1,
    marginRight: 12,
  },
  saleOptionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  saleOptionCustomer: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  saleOptionAmounts: {
    alignItems: 'flex-end',
  },
  saleOptionTotal: {
    fontSize: 12,
    color: '#6B7280',
  },
  saleOptionRemaining: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B5C9A',
    marginTop: 2,
  },
  emptyModal: {
    padding: 32,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Payment options
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
