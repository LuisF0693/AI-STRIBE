/**
 * Home Screen — Dashboard do Dia
 * Story: 2.1 — AC: 1 — botão "Iniciar Consulta" navega para ConsultaAtiva
 * Design spec: botão full-width 56px primary-600
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../utils/supabase';
import { audioUploadService } from '@aiscribe/api/audio/audio-upload.service';
import type { Consulta } from '@aiscribe/shared/types';

export default function HomeScreen() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    loadConsultas();
    checkOfflineQueue();
  }, []);

  async function loadConsultas() {
    const { data } = await supabase
      .from('consultas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setConsultas(data as Consulta[]);
  }

  async function checkOfflineQueue() {
    const size = await audioUploadService.getQueueSize();
    setQueueSize(size);
    if (size > 0) {
      // Tenta reprocessar itens pendentes
      audioUploadService.processQueue();
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadConsultas(), checkOfflineQueue()]);
    setRefreshing(false);
  }

  async function handleIniciarConsulta() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Cria a consulta no banco antes de navegar
    const { data: medico } = await supabase
      .from('medicos')
      .select('id')
      .single();

    if (!medico) {
      router.push('/(auth)/login');
      return;
    }

    const { data: consulta, error } = await supabase
      .from('consultas')
      .insert({
        medico_id: medico.id,
        timestamp_inicio: new Date().toISOString(),
        status: 'recording',
      })
      .select()
      .single();

    if (error || !consulta) return;

    // AC: 1 — navega para ConsultaAtiva com consulta_id
    router.push({
      pathname: '/consulta/ativa',
      params: {
        consulta_id: consulta.id,
      },
    });
  }

  const consultasHoje = consultas.filter(
    (c) => new Date(c.created_at).toDateString() === new Date().toDateString(),
  );

  const notasProntas = consultasHoje.filter((c) => c.status === 'completed').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Bom dia, Dr.</Text>
        </View>

        {/* Banner offline */}
        {queueSize > 0 && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              📤 {queueSize} consulta{queueSize > 1 ? 's' : ''} aguardando envio
            </Text>
          </View>
        )}

        {/* Stats card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsDate}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{consultasHoje.length}</Text>
              <Text style={styles.statLabel}>consultas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{notasProntas}</Text>
              <Text style={styles.statLabel}>notas prontas</Text>
            </View>
          </View>
        </View>

        {/* Lista de consultas recentes */}
        {consultasHoje.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🩺</Text>
            <Text style={styles.emptyTitle}>Nenhuma consulta hoje</Text>
            <Text style={styles.emptySubtitle}>
              Inicie uma nova consulta para começar a documentar.
            </Text>
          </View>
        ) : (
          <View style={styles.consultasList}>
            {consultasHoje.map((consulta) => (
              <ConsultaCardItem key={consulta.id} consulta={consulta} />
            ))}
          </View>
        )}

        {/* Espaço para o botão fixo */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão fixo na base — AC: 1 */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={styles.ctaButton}
          onPress={handleIniciarConsulta}
          accessibilityLabel="Iniciar nova consulta"
          accessibilityRole="button"
        >
          <Text style={styles.ctaButtonText}>+ Iniciar nova consulta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ConsultaCardItem({ consulta }: { consulta: Consulta }) {
  const statusConfig = {
    recording:       { color: '#EF4444', label: '● Gravando' },
    uploading:       { color: '#F59E0B', label: '↑ Enviando' },
    queued:          { color: '#2563EB', label: '⏳ Na fila' },
    transcribing:    { color: '#2563EB', label: '🎙 Transcrevendo' },
    generating_note: { color: '#7C3AED', label: '✨ Gerando nota' },
    completed:       { color: '#10B981', label: '✓ Concluída' },
    failed:          { color: '#EF4444', label: '⚠ Falhou' },
  }[consulta.status] ?? { color: '#94A3B8', label: consulta.status };

  return (
    <Pressable
      style={styles.consultaCard}
      onPress={() => {
        if (consulta.status === 'completed') {
          router.push(`/consulta/revisao/${consulta.id}`);
        }
      }}
      accessibilityLabel={`Consulta ${statusConfig.label}`}
    >
      <View style={[styles.cardBorder, { backgroundColor: statusConfig.color }]} />
      <View style={styles.cardContent}>
        <Text style={[styles.cardStatus, { color: statusConfig.color }]}>
          {statusConfig.label}
        </Text>
        <Text style={styles.cardTime}>
          {new Date(consulta.timestamp_inicio).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {consulta.duracao_ms
            ? ` · ${Math.floor(consulta.duracao_ms / 60000)}min`
            : ''}
        </Text>
      </View>
      {consulta.status === 'completed' && (
        <Text style={styles.cardCta}>Revisar →</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  offlineBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineBannerText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 20,
  },
  statsDate: {
    color: '#BFDBFE',
    fontSize: 14,
    marginBottom: 16,
    textTransform: 'capitalize' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#BFDBFE',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  consultasList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  consultaCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBorder: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  cardStatus: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cardTime: {
    fontSize: 13,
    color: '#64748B',
  },
  cardCta: {
    paddingHorizontal: 16,
    alignSelf: 'center',
    color: '#2563EB',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  ctaButton: {
    height: 56,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
