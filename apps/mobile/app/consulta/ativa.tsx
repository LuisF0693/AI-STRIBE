/**
 * ConsultaAtiva — Tela de gravação
 * Story: 2.1 — AC: 1, 2, 3, 4
 * Design spec: fundo escuro slate-950, timer 56px mono, dot pulsante
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { TimerDisplay } from '../../components/consulta/TimerDisplay';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

export default function ConsultaAtivaScreen() {
  const { consulta_id, paciente_nome } = useLocalSearchParams<{
    consulta_id: string;
    paciente_nome?: string;
  }>();

  const recorder = useAudioRecorder(consulta_id ?? null);

  // Inicializa ao montar e inicia gravação automaticamente
  useEffect(() => {
    async function init() {
      try {
        await recorder.initialize();
        if (consulta_id) {
          await recorder.startRecording(consulta_id);
          // AC: 1 — haptic ao iniciar
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch {
        // erro de permissão ou inicialização — já exposto via recorder.error
      }
    }
    init();

    // Cancela se desmontar sem encerrar
    return () => {
      if (recorder.status === 'recording' || recorder.status === 'paused') {
        recorder.cancel();
      }
    };
  }, []);

  const handleEncerrar = useCallback(async () => {
    Alert.alert(
      'Encerrar consulta?',
      'A gravação será encerrada e o áudio enviado para processamento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            // AC: haptic ao encerrar
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await recorder.stopAndUpload();
            router.replace('/(tabs)');
          },
        },
      ],
    );
  }, [recorder]);

  const handlePausarRetomar = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (recorder.status === 'recording') {
      await recorder.pauseRecording();
    } else {
      await recorder.resumeRecording();
    }
  }, [recorder]);

  const handleFechar = useCallback(() => {
    // AC: 4 — fechar não encerra a gravação, continua em background
    router.back();
  }, []);

  const isRecording = recorder.status === 'recording';
  const isPaused = recorder.status === 'paused';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* Header com botão fechar (NÃO encerra gravação) */}
        <View style={styles.header}>
          <Pressable
            style={styles.closeButton}
            onPress={handleFechar}
            accessibilityLabel="Minimizar — gravação continua em background"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Nome do paciente */}
        <View style={styles.pacienteContainer}>
          <Text style={styles.pacienteNome}>
            {paciente_nome ?? 'Consulta em andamento'}
          </Text>
        </View>

        {/* Timer e indicador de status — AC: 2 */}
        <View style={styles.timerContainer}>
          <TimerDisplay
            durationMs={recorder.durationMs}
            isRecording={isRecording}
          />
        </View>

        {/* Erro */}
        {recorder.error && recorder.error !== 'OFFLINE_QUEUED' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ {recorder.error}
            </Text>
          </View>
        )}

        {/* Status offline */}
        {recorder.error === 'OFFLINE_QUEUED' && (
          <View style={styles.offlineContainer}>
            <Text style={styles.offlineText}>
              📶 Sem conexão — áudio salvo localmente. Enviará ao reconectar.
            </Text>
          </View>
        )}

        {/* Ações principais — AC: 3 */}
        <View style={styles.actionsContainer}>
          {/* Pausar / Retomar */}
          {(isRecording || isPaused) && (
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={handlePausarRetomar}
              accessibilityLabel={isRecording ? 'Pausar gravação' : 'Retomar gravação'}
            >
              <Text style={styles.buttonSecondaryText}>
                {isRecording ? '⏸  Pausar' : '▶  Retomar'}
              </Text>
            </Pressable>
          )}

          {/* Encerrar — botão principal vermelho */}
          <Pressable
            style={[styles.button, styles.buttonDanger]}
            onPress={handleEncerrar}
            accessibilityLabel="Encerrar consulta e enviar áudio para processamento"
            // Long-press opcional — previne toque acidental
          >
            <Text style={styles.buttonDangerText}>
              ⏹  Encerrar Consulta
            </Text>
          </Pressable>
        </View>

        {/* Badge de segurança */}
        <View style={styles.securityBadge}>
          <Text style={styles.securityText}>
            🔒 Criptografado · Dados no Brasil
          </Text>
        </View>

      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950 — sempre escuro
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B', // slate-800
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  pacienteContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  pacienteNome: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#F8FAFC', // slate-50
    textAlign: 'center',
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: '#450a0a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  offlineContainer: {
    backgroundColor: '#451a03',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  offlineText: {
    color: '#fed7aa',
    fontSize: 13,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
    paddingBottom: 16,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#334155', // slate-700
  },
  buttonSecondaryText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  buttonDanger: {
    backgroundColor: '#DC2626', // red-600
  },
  buttonDangerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  securityBadge: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#475569', // slate-600
    letterSpacing: 0.5,
  },
});
