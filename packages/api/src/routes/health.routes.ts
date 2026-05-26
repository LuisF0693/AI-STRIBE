import { FastifyInstance } from 'fastify';
import { getQueueMetrics, getPrometheusMetrics } from '../queues/queues';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AC: 8 — status de cada fila para CI/CD e monitoramento
  app.get('/health/queues', async (_req, reply) => {
    try {
      const metrics = await getQueueMetrics();
      const healthy = Object.values(metrics).every(
        (m) => (m.failed ?? 0) < 100,
      );
      reply.code(healthy ? 200 : 503).send({
        status: healthy ? 'ok' : 'degraded',
        queues: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      reply.code(503).send({ status: 'error', message: 'Redis unavailable' });
    }
  });

  // AC: 5 — métricas Prometheus
  app.get('/metrics', async (_req, reply) => {
    const body = await getPrometheusMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4').send(body);
  });
}
