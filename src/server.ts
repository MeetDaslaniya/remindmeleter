import http from 'http';

import { createApp } from './app';
import { config } from './config';
import { container } from './config/container';
import { connectMongo, disconnectMongo } from './db/connection';
import { seedAdminIfNeeded } from './db/seed-admin';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectMongo();
  await seedAdminIfNeeded();

  const app = createApp();
  const server = http.createServer(app);

  const restored = await container.schedulerService.restoreScheduledJobs();
  logger.info('Scheduler restored jobs from MongoDB', { count: restored });

  void container.telegramProvider
    .ensureCallbackUpdates(config.TELEGRAM_WEBHOOK_SECRET)
    .catch((error: unknown) => {
      logger.warn('Telegram callback_query webhook check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  container.adminReportService.start();

  const port = config.PORT;

  server.listen(port, '0.0.0.0', () => {
    logger.info(`Server running on port ${port}`, {
      env: config.NODE_ENV,
      baseUrl: config.BASE_URL,
      db: config.MONGODB_DB_NAME,
    });
    logger.info(`Health check: ${config.BASE_URL}/health`);
    logger.info(`Telegram webhook: ${config.BASE_URL}/telegram/webhook`);
  });

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info(`${signal} received`);

    server.close(async () => {
      try {
        container.adminReportService.stop();
        await disconnectMongo();
      } catch (error: unknown) {
        logger.error('Error during MongoDB disconnect', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        process.exit(0);
      }
    });

    // Force exit if connections hang
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
