/**
 * Tela de Aprovação da Nota SOAP
 * Story 3.2 — AC: 2, 4, 8
 * Recebe notaId via query param, chama POST /aprovar, redireciona para PDF
 */

import { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useNotaStore } from '../../../stores/nota.store';
import { aprovar } from '../../../services/nota.service';

export default function AprovarNotaScreen() {
  const { id: consultaId, nota_id } = useLocalSearchParams<{ id: string; nota_id: string }>();
  const updateStatus = useNotaStore((s) => s.updateStatus);

  const [estado, setEstado] = useState<'confirmando' | 'aprovando' | 'erro'>('confirmando');
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // medico_id virá do contexto de autenticação (Epic 1 — auth.middleware)
  // Por ora usa placeholder até Epic 1 fundar auth
  const MEDICO_ID_PLACEHOLDER = 'medico-autenticado';

  const handleAprovar = async () => {
    if (!nota_id) {
      setMensagemErro('ID da nota não fornecido.');
      setEstado('erro');
      return;
    }

    setEstado('aprovando');
    try {
      const notaAprovada = await aprovar(nota_id, MEDICO_ID_PLACEHOLDER);
      // AC: 8 — atualiza Zustand store com status aprovado
      updateStatus(notaAprovada.status);
      // Redireciona para tela de exportação PDF (Story 3.3)
      router.replace(`/consulta/pdf/${consultaId}?nota_id=${nota_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aprovar nota.';
      setMensagemErro(msg);
      setEstado('erro');
    }
  };

  if (estado === 'aprovando') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" accessibilityLabel="Aprovando nota" />
        <Text style={styles.statusText}>Aprovando nota clínica...</Text>
      </View>
    );
  }

  if (estado === 'erro') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Não foi possível aprovar</Text>
        <Text style={styles.errorMsg}>{mensagemErro}</Text>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.back()}
          accessibilityLabel="Voltar para revisão"
          accessibilityRole="button"
        >
          <Text style={styles.btnSecondaryText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Estado 'confirmando' — tela de confirmação antes da aprovação irreversível
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titulo}>Confirmar Aprovação</Text>
        <Text style={styles.descricao}>
          Ao aprovar, a nota clínica será finalizada e ficará disponível para exportação em PDF. Esta
          ação não pode ser desfeita.
        </Text>

        <TouchableOpacity
          style={styles.btnAprovar}
          onPress={handleAprovar}
          accessibilityLabel="Confirmar aprovação da nota"
          accessibilityRole="button"
        >
          <Text style={styles.btnAprovarText}>Aprovar Nota ✓</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnCancelar}
          onPress={() => router.back()}
          accessibilityLabel="Cancelar e voltar para revisão"
          accessibilityRole="button"
        >
          <Text style={styles.btnCancelarText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', gap: 16 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#1e293b', borderRadius: 16, padding: 28, gap: 20 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', textAlign: 'center' },
  descricao: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
  statusText: { fontSize: 16, color: '#94a3b8' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#f87171' },
  errorMsg: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginHorizontal: 24 },
  btnAprovar: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnAprovarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnCancelar: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnCancelarText: { color: '#64748b', fontSize: 15 },
  btnSecondary: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1, borderColor: '#334155' },
  btnSecondaryText: { color: '#94a3b8', fontSize: 15 },
});
