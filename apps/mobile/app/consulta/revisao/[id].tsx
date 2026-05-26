/**
 * RevisaoNotaScreen — Tela de revisão da nota SOAP gerada pela IA
 * Story 3.1 — AC: 1, 2, 3, 4, 5, 6, 7, 8, 10
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../../utils/supabase';
import { useConsultaStatus } from '../../../hooks/useConsultaStatus';
import { useSoapDraft } from '../../../hooks/useSoapDraft';
import { SoapEditor } from '../../../components/nota/SoapEditor';
import type { Nota, SoapJson } from '@aiscribe/shared';

type SoapField = keyof SoapJson;

const TODAS_SECOES: SoapField[] = ['subjetivo', 'objetivo', 'avaliacao', 'plano'];

export default function RevisaoNotaScreen() {
  const { id: consultaId } = useLocalSearchParams<{ id: string }>();

  const [nota, setNota] = useState<Nota | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [secoesVistas, setSecoesVistas] = useState<Set<SoapField>>(new Set());

  const consultaStatus = useConsultaStatus(consultaId ?? null);

  // Animação skeleton (AC: 7 — enquanto nota não está pronta)
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  // Carrega nota da API (AC: 1, 7)
  useEffect(() => {
    if (!consultaId) return;
    setCarregando(true);
    supabase
      .from('notas')
      .select('id, consulta_id, transcricao_id, soap_json, cids_sugeridos, status, baixa_confianca, versao, created_at, updated_at')
      .eq('consulta_id', consultaId)
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        setCarregando(false);
        if (error) {
          setErro('Não foi possível carregar a nota. Tente novamente.');
          return;
        }
        if (data) setNota(data as Nota);
      });
  }, [consultaId]);

  // Realtime: recarrega quando nota estiver pronta (AC: 7)
  useEffect(() => {
    if (!consultaId || nota?.status === 'draft') return;

    const channel = supabase
      .channel(`nota-ready-${consultaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notas',
          filter: `consulta_id=eq.${consultaId}`,
        },
        (payload) => {
          setNota(payload.new as Nota);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [consultaId, nota?.status]);

  const draft = useSoapDraft(
    nota?.id ?? null,
    nota?.soap_json ?? { subjetivo: '', objetivo: '', avaliacao: '', plano: '' },
    nota?.cids_sugeridos ?? [],
  );

  // Rastreia seções vistas (AC: 6)
  const handleSectionViewed = useCallback((field: SoapField) => {
    setSecoesVistas((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  const todasVistas = TODAS_SECOES.every((s) => secoesVistas.has(s));

  const handleRevisarTudo = useCallback(async () => {
    if (!todasVistas || !nota) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navega para aprovação (Story 3.2)
    router.push({
      pathname: '/consulta/aprovar/[id]',
      params: {
        id: consultaId,
        nota_id: nota.id,
      },
    });
  }, [todasVistas, nota, consultaId]);

  const handleVoltar = useCallback(() => {
    Alert.alert(
      'Sair da revisão?',
      'Suas edições serão salvas como rascunho.',
      [
        { text: 'Continuar revisão', style: 'cancel' },
        { text: 'Sair', onPress: () => router.back() },
      ],
    );
  }, []);

  // AC: 7 — nota ainda sendo gerada (pipeline em andamento)
  const notaEmProcessamento =
    !nota || (consultaStatus && !['note_completed', 'completed'].includes(consultaStatus as string));

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (carregando) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#3B82F6" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.erroContainer}>
          <Text style={styles.erroText}>{erro}</Text>
          <Pressable
            style={styles.btnTentarNovamente}
            onPress={() => { setErro(null); setCarregando(true); }}
            accessibilityLabel="Tentar carregar novamente"
            accessibilityRole="button"
          >
            <Text style={styles.btnTentarNovamenteText}>Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleVoltar}
            style={styles.voltarBtn}
            accessibilityLabel="Voltar — rascunho será salvo"
            accessibilityRole="button"
          >
            <Text style={styles.voltarBtnText}>← Voltar</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Revisão da Nota</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Aviso baixa confiança */}
        {nota?.baixa_confianca && (
          <View style={styles.alertaBaixaConfianca} accessibilityRole="alert">
            <Text style={styles.alertaText}>
              ⚠️ Transcrição curta — revise a nota com atenção
            </Text>
          </View>
        )}

        {/* AC: 7 — skeleton loader enquanto nota está sendo gerada */}
        {notaEmProcessamento ? (
          <View style={styles.skeletonContainer} accessibilityLabel="Gerando nota, aguarde...">
            <Animated.View style={[styles.skeletonBar, styles.skeletonTitle, { opacity: shimmerOpacity }]} />
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.skeletonSecao}>
                <Animated.View style={[styles.skeletonBar, styles.skeletonLabel, { opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.skeletonBar, styles.skeletonContent, { opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.skeletonBar, styles.skeletonContent, { opacity: shimmerOpacity, width: '70%' }]} />
              </View>
            ))}
            <Text style={styles.skeletonMsg}>Gerando nota clínica...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              // Marca todas as seções como vistas ao rolar até o fim
            }}
          >
            <SoapEditor
              soap={draft.soap}
              cids={draft.cids}
              editedFields={draft.editedFields}
              onChangeField={draft.updateSoapField}
              onRemoveCid={draft.removeCid}
              onSectionViewed={handleSectionViewed}
            />

            {/* Indicador de progresso de revisão */}
            <View style={styles.progressContainer} accessibilityRole="none">
              {TODAS_SECOES.map((s) => (
                <View
                  key={s}
                  style={[styles.progressDot, secoesVistas.has(s) && styles.progressDotAtivo]}
                  accessibilityLabel={secoesVistas.has(s) ? `${s} revisada` : `${s} não revisada`}
                />
              ))}
            </View>
            {!todasVistas && (
              <Text style={styles.progressDica}>
                Toque em cada seção para revisar antes de aprovar
              </Text>
            )}

            {/* Espaçamento para o botão fixo */}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Botão "Revisar Tudo ✓" — AC: 6 */}
        {!notaEmProcessamento && (
          <View style={styles.footerContainer}>
            <Pressable
              style={[styles.btnRevisar, !todasVistas && styles.btnRevisarDisabled]}
              onPress={handleRevisarTudo}
              disabled={!todasVistas}
              accessibilityLabel={
                todasVistas
                  ? 'Prosseguir para aprovação da nota'
                  : 'Revise todas as seções antes de prosseguir'
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !todasVistas }}
            >
              <Text style={[styles.btnRevisarText, !todasVistas && styles.btnRevisarTextDisabled]}>
                {todasVistas ? 'Aprovar Nota →' : `Revise todas as seções (${secoesVistas.size}/4)`}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // slate-900
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  voltarBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  voltarBtnText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500' as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#F8FAFC',
  },
  alertaBaixaConfianca: {
    backgroundColor: '#451A03',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  alertaText: {
    color: '#FED7AA',
    fontSize: 13,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 20,
  },
  skeletonSecao: {
    gap: 8,
  },
  skeletonBar: {
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  skeletonTitle: {
    height: 20,
    width: '50%',
  },
  skeletonLabel: {
    height: 14,
    width: '30%',
  },
  skeletonContent: {
    height: 14,
    width: '100%',
  },
  skeletonMsg: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  progressDotAtivo: {
    backgroundColor: '#10B981',
  },
  progressDica: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  erroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  erroText: {
    color: '#FCA5A5',
    fontSize: 15,
    textAlign: 'center',
  },
  btnTentarNovamente: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  btnTentarNovamenteText: {
    color: '#93C5FD',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  btnRevisar: {
    backgroundColor: '#2563EB', // primary-600
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRevisarDisabled: {
    backgroundColor: '#1E293B',
  },
  btnRevisarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  btnRevisarTextDisabled: {
    color: '#475569',
  },
});
