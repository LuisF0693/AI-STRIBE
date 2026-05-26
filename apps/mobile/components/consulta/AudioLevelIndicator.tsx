/**
 * AudioLevelIndicator
 * Story 2.4 — AC: 5
 * Indicador visual de nível de áudio com ícone de microfone pulsante.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface Props {
  isRecording: boolean;
  level?: number; // 0-1, amplitude normalizada
}

export function AudioLevelIndicator({ isRecording, level = 0 }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      // Animação de pulso contínuo no microfone
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: level,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [level, barAnim]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={isRecording ? 'Microfone ativo, gravando áudio' : 'Microfone inativo'}
    >
      <Animated.Text
        style={[styles.icon, { transform: [{ scale: pulseAnim }] }]}
      >
        🎙️
      </Animated.Text>
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.bar,
            { width: barWidth, backgroundColor: isRecording ? '#EF4444' : '#CBD5E1' },
          ]}
        />
      </View>
      <Text style={[styles.label, isRecording && styles.labelActive]}>
        {isRecording ? 'Gravando' : 'Inativo'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  icon: {
    fontSize: 18,
  },
  barContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500' as const,
    minWidth: 48,
  },
  labelActive: {
    color: '#EF4444',
  },
});
