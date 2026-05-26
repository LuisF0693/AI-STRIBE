/**
 * Notas routes
 * Story 3.1 — AC: 1, 7 (GET nota para tela de revisão)
 */

import { FastifyInstance } from 'fastify';
import { supabase } from '../config/supabase';

export async function notasRoutes(app: FastifyInstance) {
  // GET /api/v1/notas/consulta/:consultaId
  // Retorna nota SOAP completa para a tela de revisão (Story 3.1)
  app.get<{ Params: { consultaId: string } }>(
    '/api/v1/notas/consulta/:consultaId',
    async (request, reply) => {
      const { consultaId } = request.params;

      const { data, error } = await supabase
        .from('notas')
        .select(
          'id, consulta_id, transcricao_id, soap_json, cids_sugeridos, status, baixa_confianca, versao, created_at, updated_at',
        )
        .eq('consulta_id', consultaId)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return reply.code(500).send({
          error: { code: 'QUERY_FAILED', message: error.message },
        });
      }

      if (!data) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Nota não encontrada para esta consulta' },
        });
      }

      reply.send(data);
    },
  );
}
