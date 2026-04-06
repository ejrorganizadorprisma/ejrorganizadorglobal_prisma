import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Image, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import ProductsScreen from '../screens/ProductsScreen';
import QuotesScreen from '../screens/QuotesScreen';
import QuoteFormScreen from '../screens/QuoteFormScreen';
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
  return (
    <View style={tabStyles.headerLogo}>
      <Image
        source={require('../../assets/adaptive-icon.png')}
        style={tabStyles.logoImage}
        resizeMode="contain"
      />
      <Text style={tabStyles.logoText}>EJR OrGlobal</Text>
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
        tabBarShowLabel: false,
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
      }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Cliente' }} />
            <Stack.Screen name="QuoteForm" component={QuoteFormScreen} options={{ title: 'Orcamento' }} />
            <Stack.Screen name="SaleForm" component={SaleFormScreen} options={{ title: 'Nova Venda' }} />
            <Stack.Screen name="CollectionForm" component={CollectionFormScreen} options={{ title: 'Nova Cobranca' }} />
            <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Sincronizacao' }} />
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
