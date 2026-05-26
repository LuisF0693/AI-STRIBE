/**
 * Notas routes
 * Story 3.1 — AC: 1, 7 (GET nota para tela de revisão)
 * Story 3.2 — AC: 1, 2, 3, 4, 5, 10 (PATCH rascunho, POST aprovar)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { saveNotaDraft, aprovarNota, ApiError } from '../services/nota.service';
import { getSignedPdfUrl } from '../services/pdf.service';
import { pdfGenerationQueue } from '../queues/queues';

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

  // POST /api/v1/notas/:id/exportar-pdf — Story 3.3 AC: 1
  // Enfileira geração assíncrona; retorna 202 imediatamente
  app.post<{ Params: { id: string }; Body: { medico_id: string; medico_nome: string; medico_crm: string; data_consulta: string; duracao_minutos: number } }>(
    '/api/v1/notas/:id/exportar-pdf',
    async (request, reply) => {
      const { id } = request.params;
      const { medico_id, medico_nome, medico_crm, data_consulta, duracao_minutos } = request.body ?? {};

      if (!medico_id) {
        return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'medico_id é obrigatório' } });
      }

      const { data: nota, error } = await supabase
        .from('notas')
        .select('id, consulta_id, soap_json, cids_sugeridos, status, versao')
        .eq('id', id)
        .single();

      if (error || !nota) {
        return reply.code(404).send({ error: { code: 'NOTA_NOT_FOUND', message: 'Nota não encontrada' } });
      }
      if (nota.status !== 'approved') {
        return reply.code(422).send({ error: { code: 'NOTA_NOT_APPROVED', message: 'Nota precisa estar aprovada para exportar' } });
      }

      const job = await pdfGenerationQueue.add('generate-pdf', {
        nota_id: id,
        consulta_id: nota.consulta_id,
        medico_id,
        medico_nome: medico_nome ?? '',
        medico_crm: medico_crm ?? '',
        data_consulta: data_consulta ?? new Date().toISOString(),
        duracao_minutos: duracao_minutos ?? 0,
        soap_json: nota.soap_json,
        cids: nota.cids_sugeridos ?? [],
        versao: nota.versao,
      });

      await supabase.from('notas').update({ pdf_status: 'pending' }).eq('id', id);

      return reply.code(202).send({ job_id: job.id, status: 'pending' });
    },
  );

  // GET /api/v1/notas/:id/pdf-url — Story 3.3 AC: 6
  // Retorna signed URL com TTL 24h — nunca URL permanente
  app.get<{ Params: { id: string } }>(
    '/api/v1/notas/:id/pdf-url',
    async (request, reply) => {
      const { id } = request.params;

      const { data: nota } = await supabase
        .from('notas')
        .select('pdf_url, pdf_status')
        .eq('id', id)
        .single();

      if (!nota?.pdf_url) {
        return reply.code(404).send({ error: { code: 'PDF_NOT_READY', message: 'PDF ainda não disponível' } });
      }

      try {
        const signedUrl = await getSignedPdfUrl(nota.pdf_url);
        reply.send({ signed_url: signedUrl, expires_in: 86400 });
      } catch {
        return reply.code(500).send({ error: { code: 'SIGNED_URL_FAILED', message: 'Não foi possível gerar o link' } });
      }
    },
  );

  // GET /api/v1/consultas/:id/pdf-status — Story 3.3 AC: 7
  // Polling do status da geração pelo mobile
  app.get<{ Params: { id: string } }>(
    '/api/v1/consultas/:id/pdf-status',
    async (request, reply) => {
      const { id } = request.params;

      const { data } = await supabase
        .from('notas')
        .select('id, pdf_status, pdf_url, pdf_signed')
        .eq('consulta_id', id)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();

      reply.send({
        status: data?.pdf_status ?? 'none',
        pdf_url: data?.pdf_url ?? null,
        pdf_signed: data?.pdf_signed ?? false,
      });
    },
  );
}
