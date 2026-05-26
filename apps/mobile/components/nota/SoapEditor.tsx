/**
 * SoapEditor
 * Story 3.1 — AC: 1, 2, 4, 5, 10
 * Editor inline da nota SOAP com 4 seções editáveis,
 * badge "editado" e chips de CID removíveis.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { SoapJson, CidSugestao } from '@aiscribe/shared';

type SoapField = keyof SoapJson;

const SECOES: { campo: SoapField; label: string; descricao: string }[] = [
  { campo: 'subjetivo', label: 'S — Subjetivo', descricao: 'Queixas e histórico relatado pelo paciente' },
  { campo: 'objetivo', label: 'O — Objetivo', descricao: 'Dados observados e exame físico' },
  { campo: 'avaliacao', label: 'A — Avaliação', descricao: 'Hipótese diagnóstica' },
  { campo: 'plano', label: 'P — Plano', descricao: 'Conduta, prescrições e retorno' },
];

interface SoapEditorProps {
  soap: SoapJson;
  cids: CidSugestao[];
  editedFields: Set<SoapField>;
  onChangeField: (field: SoapField, value: string) => void;
  onRemoveCid: (codigo: string) => void;
  onSectionViewed?: (field: SoapField) => void;
}

export const SoapEditor = React.memo(function SoapEditor({
  soap,
  cids,
  editedFields,
  onChangeField,
  onRemoveCid,
  onSectionViewed,
}: SoapEditorProps) {
  const handleFocus = useCallback(
    (field: SoapField) => {
      onSectionViewed?.(field);
    },
    [onSectionViewed],
  );

  return (
    <View style={styles.container}>
      {SECOES.map(({ campo, label, descricao }) => {
        const isEdited = editedFields.has(campo);
        return (
          <View key={campo} style={styles.secao} accessibilityRole="none">
            {/* Header da seção */}
            <View style={styles.secaoHeader}>
              <Text
                style={[styles.secaoLabel, isEdited && styles.secaoLabelEdited]}
                accessibilityRole="header"
              >
                {label}
              </Text>
              {isEdited && (
                <View style={styles.editadoBadge} accessibilityLabel="Seção editada por você">
                  <Text style={styles.editadoBadgeText}>editado</Text>
                </View>
              )}
            </View>

            <Text style={styles.secaoDescricao}>{descricao}</Text>

            {/* Campo de texto editável — AC: 2 */}
            <TextInput
              style={[styles.textInput, isEdited && styles.textInputEdited]}
              value={soap[campo]}
              onChangeText={(v) => onChangeField(campo, v)}
              onFocus={() => handleFocus(campo)}
              multiline
              textAlignVertical="top"
              placeholder={`Digite ${label.toLowerCase()}...`}
              placeholderTextColor="#64748B"
              accessibilityLabel={`${label}: ${descricao}`}
              accessibilityHint="Toque para editar esta seção da nota"
              accessibilityRole="text"
            />
          </View>
        );
      })}

      {/* Chips de CID-10 — AC: 5 */}
      {cids.length > 0 && (
        <View style={styles.cidsContainer} accessibilityRole="none">
          <Text style={styles.cidsLabel}>CIDs sugeridos pela IA</Text>
          <View style={styles.cidsRow}>
            {cids.map((cid) => (
              <View key={cid.codigo} style={styles.cidChip}>
                <Text style={styles.cidChipText} accessibilityLabel={`CID ${cid.codigo}: ${cid.descricao}`}>
                  {cid.codigo} · {cid.descricao}
                </Text>
                <Pressable
                  onPress={() => onRemoveCid(cid.codigo)}
                  style={styles.cidRemover}
                  accessibilityLabel={`Remover CID ${cid.codigo}`}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text style={styles.cidRemoverText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  secao: {
    gap: 6,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secaoLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#94A3B8', // slate-400 — gerado por IA
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  secaoLabelEdited: {
    color: '#10B981', // emerald-500 — editado pelo médico
  },
  editadoBadge: {
    backgroundColor: '#064E3B', // emerald-900
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editadoBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#34D399', // emerald-400
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secaoDescricao: {
    fontSize: 12,
    color: '#64748B', // slate-500
  },
  textInput: {
    backgroundColor: '#1E293B', // slate-800
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155', // slate-700 — IA
    color: '#F1F5F9', // slate-100
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
    minHeight: 100,
  },
  textInputEdited: {
    borderColor: '#059669', // emerald-600 — editado
  },
  cidsContainer: {
    gap: 8,
  },
  cidsLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600' as const,
  },
  cidsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
  },
  cidChipText: {
    fontSize: 12,
    color: '#93C5FD', // blue-300
    fontWeight: '500' as const,
    flexShrink: 1,
  },
  cidRemover: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1D4ED8', // blue-700
    alignItems: 'center',
    justifyContent: 'center',
  },
  cidRemoverText: {
    fontSize: 9,
    color: '#BFDBFE',
    fontWeight: '700' as const,
  },
});
