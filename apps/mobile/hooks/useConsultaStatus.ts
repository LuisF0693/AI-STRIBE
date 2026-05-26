/**
 * useConsultaStatus
 * Story 2.4 — AC: 1, 7, 8
 * Assina Supabase Realtime para acompanhar status do pipeline da consulta.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { ConsultaStatus } from '@aiscribe/shared';

export function useConsultaStatus(consultaId: string | null) {
  const [status, setStatus] = useState<ConsultaStatus | null>(null);

  useEffect(() => {
    if (!consultaId) return;

    // Lê status atual
    supabase
      .from('consultas')
      .select('status')
      .eq('id', consultaId)
      .single()
      .then(({ data }) => {
        if (data) setStatus(data.status as ConsultaStatus);
      });

    // AC: 6 — Realtime subscription no canal da consulta
    const channel = supabase
      .channel(`consulta-status-${consultaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consultas',
          filter: `id=eq.${consultaId}`,
        },
        (payload) => {
          setStatus((payload.new as { status: ConsultaStatus }).status);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultaId]);

  return status;
}
