/**
 * Tela de Exportação PDF
 * Story 3.3 — AC: 7, 8
 * Polling a cada 3s do status de geração → download via signed URL
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { PdfStatus } from '@aiscribe/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const POLL_INTERVAL_MS = 3_000;

interface StatusResponse {
  status: PdfStatus;
  pdf_url: string | null;
  pdf_signed: boolean;
}

export default function PdfExportScreen() {
  const { id: consultaId, nota_id } = useLocalSearchParams<{ id: string; nota_id: string }>();

  const [status, setStatus] = useState<PdfStatus>('pending');
  const [pdfSigned, setPdfSigned] = useState(false);
  const [downloadando, setDownloadando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/consultas/${consultaId}/pdf-status`);
      if (!res.ok) return;
      const data = (await res.json()) as StatusResponse;
      setStatus(data.status);
      setPdfSigned(data.pdf_signed);

      // Para o polling quando PDF estiver pronto ou falhou
      if (data.status === 'ready' || data.status === 'ready_unsigned' || data.status === 'failed') {
        stopPolling();
      }
    } catch {
      // Falha de rede — continua tentando
    }
  }, [consultaId, stopPolling]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return stopPolling;
  }, [fetchStatus, stopPolling]);

  const handleDownload = useCallback(async () => {
    if (!nota_id) return;
    setDownloadando(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/notas/${nota_id}/pdf-url`);
      const data = await res.json();
      if (data?.signed_url) {
        await Linking.openURL(data.signed_url);
      } else {
        setErro('Link de download não disponível. Tente novamente.');
      }
    } catch {
      setErro('Não foi possível abrir o PDF.');
    } finally {
      setDownloadando(false);
    }
  }, [nota_id]);

  const isGenerating = status === 'pending' || status === 'processing';
  const isReady = status === 'ready' || status === 'ready_unsigned';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titulo}>Exportação PDF</Text>

        {isGenerating && (
          <>
            <ActivityIndicator size="large" color="#2563EB" accessibilityLabel="Gerando PDF" />
            <Text style={styles.statusText}>Gerando PDF da nota clínica...</Text>
            <Text style={styles.subStatus}>
              {status === 'processing' ? 'Aplicando assinatura digital ICP-Brasil...' : 'Aguardando na fila...'}
            </Text>
          </>
        )}

        {isReady && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>PDF Pronto!</Text>

            {/* AC: 8 — aviso se gerado sem assinatura (circuit breaker acionado) */}
            {status === 'ready_unsigned' && (
              <View style={styles.alertBox} accessibilityRole="alert">
                <Text style={styles.alertText}>
                  ⚠️ PDF gerado sem assinatura digital — tente exportar novamente em alguns minutos.
                </Text>
              </View>
            )}

            {pdfSigned && (
              <Text style={styles.signedBadge}>✓ Assinado digitalmente (ICP-Brasil)</Text>
            )}

            <TouchableOpacity
              style={[styles.btnDownload, downloadando && styles.btnDisabled]}
              onPress={handleDownload}
              disabled={downloadando}
              accessibilityLabel="Baixar PDF da nota clínica"
              accessibilityRole="button"
            >
              <Text style={styles.btnDownloadText}>
                {downloadando ? 'Abrindo...' : 'Baixar PDF'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'failed' && (
          <>
            <Text style={styles.errorTitle}>Falha na Geração</Text>
            <Text style={styles.errorMsg}>
              Não foi possível gerar o PDF. Tente novamente ou contate o suporte.
            </Text>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.back()}
              accessibilityLabel="Voltar para aprovação"
              accessibilityRole="button"
            >
              <Text style={styles.btnSecondaryText}>← Voltar</Text>
            </TouchableOpacity>
          </>
        )}

        {erro && <Text style={styles.errorMsg}>{erro}</Text>}

        <TouchableOpacity
          style={styles.btnHome}
          onPress={() => router.push('/')}
          accessibilityLabel="Ir para a página inicial"
          accessibilityRole="button"
        >
          <Text style={styles.btnHomeText}>Ir para o Início</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#1e293b', borderRadius: 16, padding: 28, gap: 16, alignItems: 'center' },
  titulo: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
  statusText: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },
  subStatus: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  successIcon: { fontSize: 48, color: '#10b981' },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#10b981' },
  signedBadge: { fontSize: 12, color: '#10b981', backgroundColor: '#064e3b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  alertBox: { backgroundColor: '#78350f', borderRadius: 10, padding: 12, width: '100%' },
  alertText: { color: '#fcd34d', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#f87171' },
  errorMsg: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  btnDownload: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnDownloadText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnSecondary: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1, borderColor: '#334155' },
  btnSecondaryText: { color: '#94a3b8', fontSize: 15 },
  btnHome: { paddingVertical: 10 },
  btnHomeText: { color: '#64748b', fontSize: 14 },
});
