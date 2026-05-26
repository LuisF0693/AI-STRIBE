/**
 * TimerDisplay
 * AC: 2 — Indicador visual de gravação ativa com timer
 * Design spec: fontSize 56, fontFamily mono, color white
 */

import React, { useEffect, useRef } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface TimerDisplayProps {
  durationMs: number;
  isRecording: boolean;
}

export function TimerDisplay({ durationMs, isRecording }: TimerDisplayProps) {
  const dotOpacity = useSharedValue(1);
  const dotScale = useSharedValue(1);

  // AC: 2 — ícone pulsante durante gravação
  useEffect(() => {
    if (isRecording) {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // loop infinito
        false,
      );
      dotOpacity.value = 1;
    } else {
      dotScale.value = withTiming(1);
      dotOpacity.value = withTiming(0.4);
    }
  }, [isRecording]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Dot pulsante vermelho */}
      <Animated.View style={[styles.dot, dotStyle]} />

      {/* Label de status */}
      <Text style={styles.statusLabel}>
        {isRecording ? 'GRAVANDO' : 'PAUSADA'}
      </Text>

      {/* Timer — Design spec: 56px mono */}
      <Text style={styles.timer} accessibilityLabel={formatDurationAccessible(durationMs)}>
        {formatDuration(durationMs)}
      </Text>
    </View>
  );
}

/** Formata ms → "HH:MM:SS" */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/** Versão legível para screen readers */
function formatDurationAccessible(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hora${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);
  parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`);

  return `Tempo de gravação: ${parts.join(', ')}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444', // red-500
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 3,
    color: '#94A3B8', // slate-400
    textTransform: 'uppercase' as const,
  },
  timer: {
    fontSize: 56,
    fontFamily: 'JetBrainsMono',
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
    // Largura fixa para evitar layout shift ao mudar dígitos
    fontVariant: ['tabular-nums'],
  },
});
