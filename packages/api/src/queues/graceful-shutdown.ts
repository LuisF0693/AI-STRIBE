import { Worker } from 'bullmq';
import { GRACEFUL_SHUTDOWN_TIMEOUT_MS } from './config';

const registeredWorkers: Worker[] = [];

export function registerWorker(worker: Worker): void {
  registeredWorkers.push(worker);
}

/** Graceful shutdown: aguarda jobs ativos até GRACEFUL_SHUTDOWN_TIMEOUT_MS. AC: 9 */
export function setupGracefulShutdown(): void {
  async function shutdown(signal: string) {
    const closing = registeredWorkers.map((w) => w.close());
    const timeout = new Promise<void>((resolve) =>
      setTimeout(() => {
        resolve();
      }, GRACEFUL_SHUTDOWN_TIMEOUT_MS),
    );

    await Promise.race([Promise.all(closing), timeout]);
    process.exit(0);
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}
