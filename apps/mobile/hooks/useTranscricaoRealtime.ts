/**
 * useTranscricaoRealtime
 * Story 2.4 — AC: 1, 2, 3
 * Assina Supabase Realtime para receber segmentos de transcrição em tempo real.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import type { TranscricaoSegmento } from '@aiscribe/shared';

export function useTranscricaoRealtime(consultaId: string | null) {
  const [segmentos, setSegmentos] = useState<TranscricaoSegmento[]>([]);
  const [textoCompleto, setTextoCompleto] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const appendSegmentos = useCallback((novos: TranscricaoSegmento[]) => {
    setSegmentos((prev) => {
      const existingEnds = new Set(prev.map((s) => s.end));
      const unicos = novos.filter((s) => !existingEnds.has(s.end));
      return [...prev, ...unicos];
    });
  }, []);

  useEffect(() => {
    if (!consultaId) return;

    setIsProcessing(true);

    // Carrega transcrição existente (caso app reabra durante processamento)
    supabase
      .from('transcricoes')
      .select('texto_completo, segmentos_json, status')
      .eq('consulta_id', consultaId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.segmentos_json) {
          appendSegmentos(data.segmentos_json as TranscricaoSegmento[]);
          setTextoCompleto(data.texto_completo ?? '');
        }
        if (data?.status === 'completed' || data?.status === 'failed') {
          setIsProcessing(false);
        }
      });

    // AC: 1 — Realtime para atualizações parciais de segmentos
    const channel = supabase
      .channel(`transcricao-${consultaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transcricoes',
          filter: `consulta_id=eq.${consultaId}`,
        },
        (payload) => {
          const data = payload.new as {
            texto_completo?: string;
            segmentos_json?: TranscricaoSegmento[];
            status?: string;
          };

          if (data.texto_completo) setTextoCompleto(data.texto_completo);
          if (data.segmentos_json) appendSegmentos(data.segmentos_json);
          if (data.status === 'completed' || data.status === 'failed') {
            setIsProcessing(false);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultaId, appendSegmentos]);

  return { segmentos, textoCompleto, isProcessing };
}
