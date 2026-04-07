import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useCustomers, Customer } from '../hooks/useCustomers';

interface Props {
  navigation: any;
}

export default function CustomerFormScreen({ navigation }: Props) {
  const { createCustomer } = useCustomers();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [ci, setCi] = useState('');
  const [ruc, setRuc] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome do cliente e obrigatorio.');
      return;
    }

    setSaving(true);
    try {
      const data: Omit<Customer, 'id' | 'synced'> = {
        name: name.trim(),
        type,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        document: document.trim() || undefined,
        ci: ci.trim() || undefined,
        ruc: ruc.trim() || undefined,
      };
      await createCustomer(data);
      Alert.alert(
        'Cliente cadastrado',
        'O cliente foi salvo localmente. Após a sincronização, ele ficará aguardando aprovação do administrador. Você só poderá vender para esse cliente depois que ele for aprovado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel salvar o cliente. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do cliente"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* Type Toggle */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, type === 'INDIVIDUAL' && styles.toggleActive]}
              onPress={() => setType('INDIVIDUAL')}
            >
              <Text style={[styles.toggleText, type === 'INDIVIDUAL' && styles.toggleTextActive]}>
                Pessoa Fisica
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, type === 'BUSINESS' && styles.toggleActive]}
              onPress={() => setType('BUSINESS')}
            >
              <Text style={[styles.toggleText, type === 'BUSINESS' && styles.toggleTextActive]}>
                Empresa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="Numero de telefone"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email do cliente"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Document */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Documento</Text>
          <TextInput
            style={styles.input}
            placeholder="Numero do documento"
            placeholderTextColor="#9CA3AF"
            value={document}
            onChangeText={setDocument}
          />
        </View>

        {/* CI */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>CI (Cedula de Identidad)</Text>
          <TextInput
            style={styles.input}
            placeholder="Numero da CI"
            placeholderTextColor="#9CA3AF"
            value={ci}
            onChangeText={setCi}
          />
        </View>

        {/* RUC */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>RUC</Text>
          <TextInput
            style={styles.input}
            placeholder="Numero do RUC"
            placeholderTextColor="#9CA3AF"
            value={ruc}
            onChangeText={setRuc}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Cliente</Text>
          )}
        </TouchableOpacity>
      </View>
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
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#0B5C9A',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: '#0B5C9A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#0B5C9A',
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
});
