import type { FastifyInstance } from 'fastify';
import { logger } from '../../config/logger.js';
import { processConferenceDeadlines } from './conference.service.js';

export function registerConferenceWorker(app: FastifyInstance) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let running: Promise<void> | undefined;
  const tick = () => {
    if (running) return;
    running = processConferenceDeadlines()
      .catch(error => logger.error({ err: error }, 'Conference deadline worker failed'))
      .finally(() => { running = undefined; });
  };
  app.addHook('onReady', async () => { tick(); timer = setInterval(tick, 1000); timer.unref(); });
  app.addHook('onClose', async () => { if (timer) clearInterval(timer); await running; });
}
