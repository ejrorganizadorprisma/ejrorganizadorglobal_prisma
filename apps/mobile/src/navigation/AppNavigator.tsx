import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import ProductsScreen from '../screens/ProductsScreen';
import QuotesScreen from '../screens/QuotesScreen';
import QuoteFormScreen from '../screens/QuoteFormScreen';
import MyCommissionsScreen from '../screens/MyCommissionsScreen';
import SalesScreen from '../screens/SalesScreen';
import SaleFormScreen from '../screens/SaleFormScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import CollectionFormScreen from '../screens/CollectionFormScreen';
import SyncScreen from '../screens/SyncScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  'Home': '🏠',
  'Clientes': '👥',
  'Produtos': '📦',
  'Orcamentos': '📋',
  'Vendas': '💰',
  'Cobrancas': '🧾',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconFocused]}>
        {TAB_ICONS[label] || '📄'}
      </Text>
      {focused && <View style={tabStyles.dot} />}
    </View>
  );
}

function HeaderLogo() {
  const { companyName } = useAuthStore();
  return (
    <View style={tabStyles.headerLogo}>
      <Image
        source={require('../../assets/adaptive-icon.png')}
        style={tabStyles.logoImage}
        resizeMode="contain"
      />
      <Text style={tabStyles.logoText} numberOfLines={1}>{companyName || 'EJR OrGlobal'}</Text>
    </View>
  );
}

function HeaderRight() {
  const { user, logout } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] || 'Vendedor';
  const initial = (user?.name?.[0] || 'V').toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <View style={tabStyles.headerRight}>
      <View style={tabStyles.userBadge}>
        <View style={tabStyles.avatar}>
          <Text style={tabStyles.avatarText}>{initial}</Text>
        </View>
        <Text style={tabStyles.userName} numberOfLines={1}>{firstName}</Text>
      </View>
      <TouchableOpacity
        style={tabStyles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={tabStyles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeTabs() {
  const { mobilePermissions } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0B5C9A', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#FFF',
        headerTitle: () => <HeaderLogo />,
        headerRight: () => <HeaderRight />,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
        tabBarActiveTintColor: '#0B5C9A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarStyle: {
          height: 56,
          paddingBottom: 6,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      {mobilePermissions?.customers !== false && (
        <Tab.Screen name="Clientes" component={CustomersScreen} />
      )}
      {mobilePermissions?.products !== false && (
        <Tab.Screen name="Produtos" component={ProductsScreen} />
      )}
      {mobilePermissions?.quotes !== false && (
        <Tab.Screen name="Orcamentos" component={QuotesScreen} />
      )}
      {mobilePermissions?.sales !== false && (
        <Tab.Screen name="Vendas" component={SalesScreen} />
      )}
      {(mobilePermissions as any)?.collections !== false && (
        <Tab.Screen name="Cobrancas" component={CollectionsScreen} />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={tabStyles.splash}>
        <Image
          source={require('../../assets/adaptive-icon.png')}
          style={tabStyles.splashLogo}
          resizeMode="contain"
        />
        <Text style={tabStyles.splashTitle}>EJR OrGlobal</Text>
        <Text style={tabStyles.splashSub}>Carregando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: '#0B5C9A' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitle: () => <HeaderLogo />,
        headerRight: () => <HeaderRight />,
      }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Novo Cliente', headerTitle: 'Novo Cliente' }} />
            <Stack.Screen
              name="MyCommissions"
              component={MyCommissionsScreen}
              options={{ title: 'Minhas Comissões', headerTitle: 'Minhas Comissões' }}
            />
            <Stack.Screen
              name="QuoteForm"
              component={QuoteFormScreen}
              options={({ route }: any) => ({
                title: route?.params?.quoteId ? 'Editar Orçamento' : 'Novo Orçamento',
                headerTitle: route?.params?.quoteId ? 'Editar Orçamento' : 'Novo Orçamento',
              })}
            />
            <Stack.Screen name="SaleForm" component={SaleFormScreen} options={{ title: 'Nova Venda', headerTitle: 'Nova Venda' }} />
            <Stack.Screen name="CollectionForm" component={CollectionFormScreen} options={{ title: 'Nova Cobranca', headerTitle: 'Nova Cobranca' }} />
            <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Sincronizacao', headerTitle: 'Sincronizacao' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    fontSize: 24,
    opacity: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0B5C9A',
    marginTop: 2,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 180,
  },
  logoImage: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingRight: 10,
    borderRadius: 16,
    maxWidth: 130,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarText: {
    color: '#0B5C9A',
    fontSize: 11,
    fontWeight: '800',
  },
  userName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B5C9A',
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
  },
  splashTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  splashSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
  },
});
