import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onPress: () => void;
}

export default function SyncBadge({ isOnline, pendingCount, isSyncing, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
      <Text style={styles.text}>
        {isSyncing ? 'Sincronizando...' : isOnline ? 'Online' : 'Offline'}
      </Text>
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12, color: '#FFF', fontWeight: '500' },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
});
