import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { getDatabase } from './src/db/migrations';

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    getDatabase().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#0B5C9A" />
      <AppNavigator />
    </>
  );
}
