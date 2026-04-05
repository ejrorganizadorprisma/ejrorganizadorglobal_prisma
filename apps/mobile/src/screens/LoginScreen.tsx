import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

const DEFAULT_URL = 'https://ejr-organizador.vercel.app';
const STORAGE_KEY_URL = '@ejr_api_url';
const STORAGE_KEY_API_KEY = '@ejr_mobile_api_key';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connectionKey, setConnectionKey] = useState('');
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, mobileAccessDenied, mobileAccessError } = useAuthStore();

  // Load saved connection key
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_API_KEY).then(key => {
      if (key) setConnectionKey(key);
    });
  }, []);

  // Show mobile access errors
  useEffect(() => {
    if (mobileAccessDenied && mobileAccessError) {
      setError(mobileAccessError);
    }
  }, [mobileAccessDenied, mobileAccessError]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha.');
      return;
    }

    if (!connectionKey.trim()) {
      setError('Informe a chave de conexão fornecida pelo administrador.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (serverUrl !== DEFAULT_URL) {
        await AsyncStorage.setItem(STORAGE_KEY_URL, serverUrl);
      }
      const result = await login(email.trim(), password, connectionKey.trim());
      if (!result.success) {
        setError(result.error || 'Erro ao fazer login. Verifique suas credenciais.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Blue header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EJR OrGlobal</Text>
          <Text style={styles.headerSubtitle}>Plataforma de Vendas</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar na sua conta</Text>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Chave de Conexão</Text>
          <TextInput
            style={styles.input}
            value={connectionKey}
            onChangeText={setConnectionKey}
            placeholder="Chave fornecida pelo administrador"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <Text style={styles.hint}>
            Solicite a chave ao administrador do sistema
          </Text>

          {/* Server config toggle */}
          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.serverToggleText}>
              {showServerConfig ? 'Ocultar' : 'Configurar Servidor'}
            </Text>
            <Text style={styles.chevron}>{showServerConfig ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverSection}>
              <Text style={styles.label}>URL do Servidor</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="https://ejr-organizador.vercel.app"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading}
              />
            </View>
          )}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>EJR Organizador v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { flexGrow: 1 },

  /* Header */
  header: {
    backgroundColor: '#0B5C9A',
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },

  /* Inputs */
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  /* Error */
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },

  /* Server config */
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  serverToggleText: {
    fontSize: 13,
    color: '#6B7280',
  },
  chevron: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 6,
  },
  serverSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 4,
  },

  /* Login button */
  loginButton: {
    backgroundColor: '#0B5C9A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  /* Footer */
  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 16,
  },
});
