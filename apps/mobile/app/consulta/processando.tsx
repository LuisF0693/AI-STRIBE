/**
 * ProcessandoNota — Tela de espera após encerramento da consulta
 * Story 2.4 — AC: 7, 8, 9
 * Exibe skeleton loader e progresso estimado até nota SOAP pronta.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useConsultaStatus } from '../../hooks/useConsultaStatus';

const ETAPAS = [
  { status: 'queued',          label: 'Áudio recebido',          icon: '✅', done: true },
  { status: 'transcribing',    label: 'Transcrevendo consulta',  icon: '🎙️', active: true },
  { status: 'generating_note', label: 'Gerando nota SOAP',       icon: '✨' },
  { status: 'completed',       label: 'Nota pronta para revisão',icon: '📋' },
] as const;

const TEMPOS_ESTIMADOS: Record<string, string> = {
  queued:          'iniciando...',
  transcribing:    '~30-60 segundos',
  generating_note: '~10-20 segundos',
  completed:       'pronto!',
};

export default function ProcessandoNotaScreen() {
  const { consulta_id } = useLocalSearchParams<{ consulta_id: string }>();
  const status = useConsultaStatus(consulta_id ?? null);
  const [elapsed, setElapsed] = useState(0);
  const shimmer = new Animated.Value(0);

  // Timer de tempo decorrido
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Animação de shimmer para skeleton
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmer]);

  // AC: 8 — navega para revisão quando nota pronta
  useEffect(() => {
    if (status === 'completed' && consulta_id) {
      router.replace(`/consulta/revisao/${consulta_id}`);
    }
  }, [status, consulta_id]);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  const etapaAtual = ETAPAS.findIndex((e) => e.status === status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.titulo} accessibilityRole="header">
          Processando consulta
        </Text>
        <Text style={styles.subtitulo}>
          {TEMPOS_ESTIMADOS[status ?? 'queued']}
        </Text>

        {/* Progress steps */}
        <View style={styles.etapas} accessibilityLabel="Etapas de processamento">
          {ETAPAS.map((etapa, i) => {
            const concluida = i < etapaAtual;
            const ativa = i === etapaAtual;

            return (
              <View key={etapa.status} style={styles.etapa}>
                <View style={[
                  styles.etapaIcone,
                  concluida && styles.etapaIconeConcluida,
                  ativa && styles.etapaIconeAtiva,
                ]}>
                  <Text style={styles.etapaIconeText}>
                    {concluida ? '✓' : etapa.icon}
                  </Text>
                </View>
                <Text style={[
                  styles.etapaLabel,
                  concluida && styles.etapaLabelConcluida,
                  ativa && styles.etapaLabelAtiva,
                ]}>
                  {etapa.label}
                </Text>
                {ativa && (
                  <Animated.View style={[styles.etapaSpinner, { opacity: shimmerOpacity }]}>
                    <Text style={styles.etapaSpinnerText}>⏳</Text>
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>

        {/* Skeleton da nota — preview do que virá */}
        <View style={styles.skeletonCard}>
          <Text style={styles.skeletonTitle}>Prévia da nota SOAP</Text>
          {['Subjetivo', 'Objetivo', 'Avaliação', 'Plano'].map((campo) => (
            <View key={campo} style={styles.skeletonField}>
              <Text style={styles.skeletonFieldLabel}>{campo}</Text>
              <Animated.View style={[styles.skeletonLine, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonLineShort, { opacity: shimmerOpacity }]} />
            </View>
          ))}
        </View>

        {/* Tempo decorrido */}
        <Text style={styles.elapsed} accessibilityLabel={`Tempo decorrido: ${elapsed} segundos`}>
          {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')} decorridos
        </Text>

        {/* Voltar para o dashboard sem perder processamento */}
        <Pressable
          style={styles.voltarBtn}
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Voltar ao início — processamento continua em background"
        >
          <Text style={styles.voltarBtnText}>Voltar ao início</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 24 },
  titulo: { fontSize: 24, fontWeight: '700' as const, color: '#0F172A', marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#64748B', marginBottom: 32 },
  etapas: { gap: 16, marginBottom: 32 },
  etapa: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etapaIcone: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  etapaIconeConcluida: { backgroundColor: '#10B981' },
  etapaIconeAtiva: { backgroundColor: '#2563EB' },
  etapaIconeText: { fontSize: 16 },
  etapaLabel: { flex: 1, fontSize: 15, color: '#94A3B8' },
  etapaLabelConcluida: { color: '#10B981', fontWeight: '600' as const },
  etapaLabelAtiva: { color: '#2563EB', fontWeight: '600' as const },
  etapaSpinner: { marginLeft: 'auto' },
  etapaSpinnerText: { fontSize: 16 },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  skeletonTitle: { fontSize: 14, fontWeight: '600' as const, color: '#94A3B8', marginBottom: 4 },
  skeletonField: { gap: 6 },
  skeletonFieldLabel: { fontSize: 12, fontWeight: '700' as const, color: '#CBD5E1', textTransform: 'uppercase' as const },
  skeletonLine: { height: 12, backgroundColor: '#E2E8F0', borderRadius: 6 },
  skeletonLineShort: { width: '60%' },
  elapsed: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 16 },
  voltarBtn: { alignItems: 'center', padding: 16 },
  voltarBtnText: { fontSize: 16, color: '#2563EB', fontWeight: '600' as const },
});
