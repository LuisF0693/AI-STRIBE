/**
 * TranscriptionFeed
 * Story 2.4 — AC: 1, 2, 3, 4, 9
 * FlatList de segmentos de transcrição com auto-scroll e diferenciação médico/paciente.
 */

import React, { useRef, useCallback, memo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { TranscricaoSegmento } from '@aiscribe/shared';

interface Props {
  segmentos: TranscricaoSegmento[];
  isProcessing: boolean;
}

const SegmentoItem = memo(function SegmentoItem({ item }: { item: TranscricaoSegmento }) {
  const isMedico = item.speaker === 'medico';
  const isPaciente = item.speaker === 'paciente';

  return (
    <View
      style={[
        styles.balao,
        isMedico && styles.balaoMedico,
        isPaciente && styles.balaoPaciente,
        !item.speaker && styles.balaoNeutro,
      ]}
      accessible
      accessibilityLabel={`${isMedico ? 'Médico' : isPaciente ? 'Paciente' : ''}: ${item.text}`}
    >
      {item.speaker && (
        <Text style={styles.speakerLabel}>
          {isMedico ? 'Médico' : 'Paciente'}
        </Text>
      )}
      <Text style={styles.textoSegmento}>{item.text}</Text>
      <Text style={styles.timestamp}>
        {formatTimestamp(item.start)}
      </Text>
    </View>
  );
});

export function TranscriptionFeed({ segmentos, isProcessing }: Props) {
  const listRef = useRef<FlatList>(null);

  const renderItem = useCallback(
    ({ item }: { item: TranscricaoSegmento }) => <SegmentoItem item={item} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: TranscricaoSegmento) => `${item.start}-${item.end}`,
    [],
  );

  const onContentSizeChange = useCallback(() => {
    if (segmentos.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [segmentos.length]);

  if (segmentos.length === 0 && isProcessing) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.emptyText}>Aguardando transcrição...</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={segmentos}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onContentSizeChange={onContentSizeChange}
      contentContainerStyle={styles.listContent}
      // AC: 4 — performance com listas longas
      initialNumToRender={10}
      maxToRenderPerBatch={5}
      windowSize={10}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Feed de transcrição da consulta"
    />
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 8,
  },
  balao: {
    borderRadius: 12,
    padding: 12,
    maxWidth: '90%',
  },
  balaoMedico: {
    backgroundColor: '#E3F2FD', // azul claro
    alignSelf: 'flex-end',
  },
  balaoPaciente: {
    backgroundColor: '#F5F5F5', // cinza claro
    alignSelf: 'flex-start',
  },
  balaoNeutro: {
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  textoSegmento: {
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
});
