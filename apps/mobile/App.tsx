import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { getDatabase } from './src/db/migrations';
import ConflictToast from './src/components/ConflictToast';

// Handler global de notificacoes em foreground: mostra alerta, toca som e
// atualiza badge. Definido fora do componente para rodar antes do mount.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }) as any,
});

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    getDatabase().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#0B5C9A" />
      <AppNavigator />
      {/* Toast global de conflito de sync (servidor vence). Renderizado
          fora do NavigationContainer para aparecer em qualquer tela. */}
      <ConflictToast />
    </>
  );
}
