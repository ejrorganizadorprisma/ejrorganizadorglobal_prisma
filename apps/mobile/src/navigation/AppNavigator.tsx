import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Image } from 'react-native';
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

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Home': '🏠',
    'Clientes': '👥',
    'Produtos': '📦',
    'Orçamentos': '📋',
    'Vendas': '💰',
    'Cobranças': '🧾',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[label] || '📄'}</Text>
      <Text style={{ fontSize: 10, color: focused ? '#0B5C9A' : '#9CA3AF', fontWeight: focused ? '700' : '400' }}>
        {label}
      </Text>
    </View>
  );
}

function HomeTabs() {
  const { mobilePermissions } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
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
        <Tab.Screen name="Orçamentos" component={QuotesScreen} />
      )}
      {mobilePermissions?.sales !== false && (
        <Tab.Screen name="Vendas" component={SalesScreen} />
      )}
      {(mobilePermissions as any)?.collections !== false && (
        <Tab.Screen name="Cobranças" component={CollectionsScreen} />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B5C9A' }}>
        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>EJR OrGlobal</Text>
        <Text style={{ color: '#FFF', fontSize: 14, marginTop: 8 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: '#0B5C9A' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitle: () => (
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
        ),
      }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Cliente' }} />
            <Stack.Screen name="QuoteForm" component={QuoteFormScreen} options={{ title: 'Orçamento' }} />
            <Stack.Screen name="SaleForm" component={SaleFormScreen} options={{ title: 'Nova Venda' }} />
            <Stack.Screen name="CollectionForm" component={CollectionFormScreen} options={{ title: 'Nova Cobranca' }} />
            <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Sincronização' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
