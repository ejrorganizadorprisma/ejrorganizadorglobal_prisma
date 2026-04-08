import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCustomers, Customer, CustomerAddress } from '../hooks/useCustomers';
import { formatPhone, formatDocument, onlyDigits } from '../utils/masks';

interface Props {
  navigation: any;
}

type SectionKey = 'personal' | 'contact' | 'address' | 'notes';

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Outro', 'Não informar'];
const MARITAL_OPTIONS = ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União estável', 'Outro'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateToYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymdToDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export default function CustomerFormScreen({ navigation }: Props) {
  const { createCustomer } = useCustomers();
  const [saving, setSaving] = useState(false);

  // Section open state
  const [sectionOpen, setSectionOpen] = useState<Record<SectionKey, boolean>>({
    personal: true,
    contact: true,
    address: false,
    notes: false,
  });

  const toggleSection = (key: SectionKey) =>
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // Personal
  const [name, setName] = useState('');
  const [type, setType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');
  const [document, setDocument] = useState('');
  const [ci, setCi] = useState('');
  const [ruc, setRuc] = useState('');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<string>('');
  const [profession, setProfession] = useState('');

  // Contact
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phoneAlt, setPhoneAlt] = useState('');
  const [email, setEmail] = useState('');
  const [emailAlt, setEmailAlt] = useState('');

  // Address
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  const onChangeBirthDate = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && date) {
      setBirthDate(dateToYMD(date));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome do cliente é obrigatório.');
      setSectionOpen((p) => ({ ...p, personal: true }));
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Erro', 'O telefone é obrigatório.');
      setSectionOpen((p) => ({ ...p, contact: true }));
      return;
    }
    const docDigits = document.trim() ? onlyDigits(document) : '';
    const ciDigits = ci.trim() ? onlyDigits(ci) : '';
    const rucDigits = ruc.trim() ? onlyDigits(ruc) : '';
    if (!docDigits && !ciDigits && !rucDigits) {
      Alert.alert(
        'Erro',
        'Informe ao menos um documento: CPF/CNPJ, CI ou RUC.'
      );
      setSectionOpen((p) => ({ ...p, personal: true }));
      return;
    }

    // Build optional address (only if at least one field is filled)
    const addressFilled =
      zipCode.trim() ||
      street.trim() ||
      addrNumber.trim() ||
      complement.trim() ||
      district.trim() ||
      city.trim() ||
      state.trim();

    const address: CustomerAddress | undefined = addressFilled
      ? {
          zipCode: zipCode.trim() || undefined,
          street: street.trim() || undefined,
          number: addrNumber.trim() || undefined,
          complement: complement.trim() || undefined,
          district: district.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        }
      : undefined;

    setSaving(true);
    try {
      const data: Omit<Customer, 'id' | 'synced'> = {
        name: name.trim(),
        type,
        phone: onlyDigits(phone),
        email: email.trim() || undefined,
        document: docDigits || undefined,
        ci: ciDigits || undefined,
        ruc: rucDigits || undefined,
        rg: rg.trim() || null,
        birthDate: birthDate.trim() || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        profession: profession.trim() || null,
        whatsapp: whatsapp.trim() ? onlyDigits(whatsapp) : null,
        phoneAlt: phoneAlt.trim() ? onlyDigits(phoneAlt) : null,
        emailAlt: emailAlt.trim() || null,
        notes: notes.trim() || null,
        address: address ?? null,
      };
      await createCustomer(data);
      Alert.alert(
        'Cliente cadastrado',
        'O cliente foi salvo localmente. Após a sincronização, ele ficará aguardando aprovação do administrador. Você só poderá vender para esse cliente depois que ele for aprovado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro ao salvar cliente',
        error?.message || 'Não foi possível salvar. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderSectionHeader = (key: SectionKey, title: string) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(key)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Seção ${title}`}
      accessibilityState={{ expanded: sectionOpen[key] }}
    >
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <Text style={styles.sectionHeaderIcon}>{sectionOpen[key] ? '▾' : '▸'}</Text>
    </TouchableOpacity>
  );

  const renderChipGroup = (
    options: string[],
    value: string,
    onChange: (v: string) => void
  ) => (
    <View style={styles.chipContainer}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(selected ? '' : opt)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ============== DADOS PESSOAIS ============== */}
        <View style={styles.card}>
          {renderSectionHeader('personal', 'Dados pessoais')}
          {sectionOpen.personal && (
            <View style={styles.sectionBody}>
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
                    accessibilityRole="radio"
                    accessibilityState={{ selected: type === 'INDIVIDUAL' }}
                    accessibilityLabel="Tipo Pessoa Física"
                  >
                    <Text style={[styles.toggleText, type === 'INDIVIDUAL' && styles.toggleTextActive]}>
                      Pessoa Física
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, type === 'BUSINESS' && styles.toggleActive]}
                    onPress={() => setType('BUSINESS')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: type === 'BUSINESS' }}
                    accessibilityLabel="Tipo Empresa"
                  >
                    <Text style={[styles.toggleText, type === 'BUSINESS' && styles.toggleTextActive]}>
                      Empresa
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Document */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Documento (CPF/CNPJ)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número do documento"
                  placeholderTextColor="#9CA3AF"
                  value={document}
                  onChangeText={(t) => setDocument(formatDocument(t))}
                  keyboardType="numeric"
                />
              </View>

              {/* CI */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CI (Cédula de Identidad)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número da CI"
                  placeholderTextColor="#9CA3AF"
                  value={ci}
                  onChangeText={(t) => setCi(formatDocument(t))}
                  keyboardType="numeric"
                />
              </View>

              {/* RUC */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>RUC</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número do RUC"
                  placeholderTextColor="#9CA3AF"
                  value={ruc}
                  onChangeText={(t) => setRuc(formatDocument(t))}
                  keyboardType="numeric"
                />
              </View>

              {/* RG */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>RG</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número do RG"
                  placeholderTextColor="#9CA3AF"
                  value={rg}
                  onChangeText={setRg}
                />
              </View>

              {/* Birth Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Data de nascimento</Text>
                <View style={styles.dateRow}>
                  <TextInput
                    style={[styles.input, styles.dateInput]}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    value={birthDate}
                    onChangeText={setBirthDate}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={styles.datePickerIconButton}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                    accessibilityLabel="Abrir seletor de data"
                  >
                    <Text style={styles.datePickerIconText}>📅</Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={ymdToDate(birthDate) || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={onChangeBirthDate}
                  />
                )}
              </View>

              {/* Gender */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Gênero</Text>
                {renderChipGroup(GENDER_OPTIONS, gender, setGender)}
              </View>

              {/* Marital Status */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Estado civil</Text>
                {renderChipGroup(MARITAL_OPTIONS, maritalStatus, setMaritalStatus)}
              </View>

              {/* Profession */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Profissão</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Profissão / ocupação"
                  placeholderTextColor="#9CA3AF"
                  value={profession}
                  onChangeText={setProfession}
                />
              </View>
            </View>
          )}
        </View>

        {/* ============== CONTATOS ============== */}
        <View style={styles.card}>
          {renderSectionHeader('contact', 'Contatos')}
          {sectionOpen.contact && (
            <View style={styles.sectionBody}>
              {/* Phone */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Telefone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número de telefone"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={(t) => setPhone(formatPhone(t))}
                  keyboardType="phone-pad"
                />
              </View>

              {/* WhatsApp */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>WhatsApp</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número de WhatsApp"
                  placeholderTextColor="#9CA3AF"
                  value={whatsapp}
                  onChangeText={(t) => setWhatsapp(formatPhone(t))}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Phone Alt */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Telefone alternativo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Outro telefone de contato"
                  placeholderTextColor="#9CA3AF"
                  value={phoneAlt}
                  onChangeText={(t) => setPhoneAlt(formatPhone(t))}
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

              {/* Email Alt */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email alternativo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email alternativo"
                  placeholderTextColor="#9CA3AF"
                  value={emailAlt}
                  onChangeText={setEmailAlt}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}
        </View>

        {/* ============== ENDEREÇO ============== */}
        <View style={styles.card}>
          {renderSectionHeader('address', 'Endereço')}
          {sectionOpen.address && (
            <View style={styles.sectionBody}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CEP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="CEP"
                  placeholderTextColor="#9CA3AF"
                  value={zipCode}
                  onChangeText={setZipCode}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Rua / Logradouro</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rua, avenida..."
                  placeholderTextColor="#9CA3AF"
                  value={street}
                  onChangeText={setStreet}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Número</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número"
                  placeholderTextColor="#9CA3AF"
                  value={addrNumber}
                  onChangeText={setAddrNumber}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Complemento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Apto, bloco, referência..."
                  placeholderTextColor="#9CA3AF"
                  value={complement}
                  onChangeText={setComplement}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Bairro</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bairro"
                  placeholderTextColor="#9CA3AF"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Cidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cidade"
                  placeholderTextColor="#9CA3AF"
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Estado / Departamento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="UF / Departamento"
                  placeholderTextColor="#9CA3AF"
                  value={state}
                  onChangeText={setState}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          )}
        </View>

        {/* ============== OBSERVAÇÕES ============== */}
        <View style={styles.card}>
          {renderSectionHeader('notes', 'Observações')}
          {sectionOpen.notes && (
            <View style={styles.sectionBody}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Anotações adicionais sobre o cliente..."
                  placeholderTextColor="#9CA3AF"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky save button */}
      <View style={styles.footer}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B5C9A',
  },
  sectionHeaderIcon: {
    fontSize: 16,
    color: '#0B5C9A',
    fontWeight: '700',
  },
  sectionBody: {
    padding: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 96,
    paddingTop: 10,
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#0B5C9A',
    borderColor: '#0B5C9A',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFF',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    marginRight: 8,
  },
  datePickerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerIconText: {
    fontSize: 18,
  },
  footer: {
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#0B5C9A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
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
