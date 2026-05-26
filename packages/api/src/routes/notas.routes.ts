/**
 * Notas routes
 * Story 3.1 — AC: 1, 7 (GET nota para tela de revisão)
 * Story 3.2 — AC: 1, 2, 3, 4, 5, 10 (PATCH rascunho, POST aprovar)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { saveNotaDraft, aprovarNota, ApiError } from '../services/nota.service';

const patchNotaBody = z.object({
  soap_json: z.object({
    subjetivo: z.string(),
    objetivo: z.string(),
    avaliacao: z.string(),
    plano: z.string(),
  }),
  cids_sugeridos: z.array(
    z.object({
      codigo: z.string(),
      descricao: z.string(),
      confianca: z.number().min(0).max(1),
    }),
  ),
});

export async function notasRoutes(app: FastifyInstance) {
  // GET /api/v1/notas/consulta/:consultaId — Story 3.1
  app.get<{ Params: { consultaId: string } }>(
    '/api/v1/notas/consulta/:consultaId',
    async (request, reply) => {
      const { consultaId } = request.params;

      const { data, error } = await supabase
        .from('notas')
        .select(
          'id, consulta_id, transcricao_id, soap_json, cids_sugeridos, status, baixa_confianca, versao, approved_by, approved_at, pdf_status, created_at, updated_at',
        )
        .eq('consulta_id', consultaId)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return reply.code(500).send({ error: { code: 'QUERY_FAILED', message: error.message } });
      }
      if (!data) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Nota não encontrada para esta consulta' },
        });
      }

      reply.send(data);
    },
  );

  // PATCH /api/v1/notas/:id — Story 3.2 AC: 1, 9
  // Persiste rascunho editado sem alterar status
  app.patch<{ Params: { id: string }; Body: z.infer<typeof patchNotaBody> }>(
    '/api/v1/notas/:id',
    async (request, reply) => {
      const { id } = request.params;

      const parsed = patchNotaBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        });
      }

      try {
        const nota = await saveNotaDraft(id, parsed.data.soap_json, parsed.data.cids_sugeridos);
        reply.send(nota);
      } catch (err) {
        if (err instanceof ApiError) {
          return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Erro interno' } });
      }
    },
  );

  // POST /api/v1/notas/:id/aprovar — Story 3.2 AC: 2, 3, 4, 5, 10
  // Finaliza nota: draft → approved, cria snapshot, notifica Realtime
  app.post<{ Params: { id: string }; Body: { medico_id: string } }>(
    '/api/v1/notas/:id/aprovar',
    async (request, reply) => {
      const { id } = request.params;
      const { medico_id } = request.body ?? {};

      if (!medico_id) {
        return reply.code(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'medico_id é obrigatório' },
        });
      }

      try {
        const nota = await aprovarNota(id, medico_id);
        reply.send(nota);
      } catch (err) {
        if (err instanceof ApiError) {
          return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Erro interno' } });
      }
    },
  );
}
