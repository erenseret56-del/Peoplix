import { buildApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, createIndexes, closeDatabaseConnection } from './infrastructure/database/index.js';
import { authService } from './modules/auth/auth.service.js';

let isShuttingDown = false;

async function start() {
  logger.info('Starting PEOPLIX backend server...');

  // ── 1. CONNECT DATABASE (MongoDB Atlas) ───────────────────────────────
  await connectDatabase();
  await createIndexes();

  // ── 2. SEED SUPER ADMIN (first run only, idempotent) ──────────────────
  if (config.admin.email && config.admin.password) {
    await authService.createSuperAdmin(config.admin.email, config.admin.password);
  }

  // ── 3. START FASTIFY ──────────────────────────────────────────────────
  const app = await buildApp();

  await app.listen({
    port: config.app.port,
    host: '0.0.0.0', // Required for Docker / load balancer
  });

  logger.info(
    { port: config.app.port, env: config.app.env, pid: process.pid },
    `✅ PEOPLIX API listening on port ${config.app.port}`
  );

  // ── 4. GRACEFUL SHUTDOWN ──────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown initiated');

    try {
      await app.close();
      logger.info('HTTP server closed');
      await closeDatabaseConnection();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('uncaughtException',  (err)    => { logger.fatal({ err },    'Uncaught exception');          shutdown('uncaughtException');  });
  process.on('unhandledRejection', (reason) => { logger.fatal({ reason }, 'Unhandled promise rejection'); shutdown('unhandledRejection'); });
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
