import { FastifyInstance } from 'fastify';
import { supabase } from '../config/supabase';
import { transcriptionQueue, noteGenerationQueue } from '../queues/queues';

export async function consultasRoutes(app: FastifyInstance) {
  // AC: 3 — estado completo do pipeline por consulta
  app.get<{ Params: { id: string } }>('/api/v1/consultas/:id/status', async (request, reply) => {
    const { id } = request.params;

    const [{ data: consulta }, { data: transcricao }, { data: nota }] = await Promise.all([
      supabase.from('consultas').select('id, status, audio_url').eq('id', id).single(),
      supabase.from('transcricoes').select('status, custo_usd').eq('consulta_id', id).maybeSingle(),
      supabase.from('notas').select('status, versao').eq('consulta_id', id).maybeSingle(),
    ]);

    if (!consulta) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Consulta não encontrada' } });
    }

    reply.send({
      consulta_id: id,
      pipeline: {
        upload: consulta.status === 'recording' ? 'pending' : 'completed',
        transcription: transcricao?.status ?? 'pending',
        note: nota?.status ?? 'pending',
      },
      consulta_status: consulta.status,
    });
  });

  // POST /api/v1/consultas — cria nova consulta e retorna ID
  app.post<{ Body: { medico_id: string; paciente_id?: string } }>(
    '/api/v1/consultas',
    async (request, reply) => {
      const { medico_id, paciente_id } = request.body;
      const { data, error } = await supabase
        .from('consultas')
        .insert({ medico_id, paciente_id, timestamp_inicio: new Date().toISOString(), status: 'recording' })
        .select()
        .single();

      if (error || !data) {
        return reply.code(500).send({ error: { code: 'INSERT_FAILED', message: error?.message } });
      }

      reply.code(201).send(data);
    },
  );

  // PATCH /api/v1/consultas/:id — encerra gravação, confirma upload, enfileira transcrição
  app.patch<{ Params: { id: string }; Body: { audio_url?: string; duracao_ms?: number } }>(
    '/api/v1/consultas/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { audio_url, duracao_ms } = request.body;

      const updates: Record<string, unknown> = { timestamp_fim: new Date().toISOString() };
      if (audio_url) updates.audio_url = audio_url;
      if (duracao_ms) updates.duracao_ms = duracao_ms;
      if (audio_url) updates.status = 'queued';

      const { data, error } = await supabase.from('consultas').update(updates).eq('id', id).select().single();
      if (error || !data) {
        return reply.code(500).send({ error: { code: 'UPDATE_FAILED', message: error?.message } });
      }

      // Enfileira transcrição se áudio disponível
      if (audio_url) {
        await transcriptionQueue.add('transcribe', { consulta_id: id, audio_url }, { jobId: `transcribe-${id}` });
      }

      reply.send(data);
    },
  );
}
