import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { onConflict, ConflictEvent } from '../lib/conflictNotifier';

const AUTO_DISMISS_MS = 6000;

export default function ConflictToast() {
  const [event, setEvent] = useState<ConflictEvent | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = onConflict((ev) => {
      setEvent(ev);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!event) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setEvent(null);
      });
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [event, opacity]);

  if (!event) return null;

  const handleDismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setEvent(null);
    });
  };

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Animated.View style={[styles.toast, { opacity }]}>
        <Text style={styles.icon}>!</Text>
        <View style={styles.body}>
          <Text style={styles.title}>Atualizacao do administrador</Text>
          <Text style={styles.message}>{event.message}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton} accessibilityLabel="Fechar aviso">
          <Text style={styles.dismissText}>x</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '800',
    fontSize: 16,
    marginRight: 10,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
  },
  title: {
    color: '#78350F',
    fontWeight: '700',
    fontSize: 13,
  },
  message: {
    color: '#92400E',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  dismissText: {
    color: '#78350F',
    fontSize: 16,
    fontWeight: '700',
  },
});
