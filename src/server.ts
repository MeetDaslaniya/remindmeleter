import fs from 'fs';

import path from 'path';

import { createApp } from './app';

import { config } from './config';

import { container } from './config/container';

import { connectMongo } from './db/connection';

import { seedAdminIfNeeded } from './db/seed-admin';

import { logger } from './utils/logger';



async function bootstrap(): Promise<void> {

  const logsDir = path.join(process.cwd(), 'logs');

  if (!fs.existsSync(logsDir)) {

    fs.mkdirSync(logsDir, { recursive: true });

  }



  await connectMongo();

  await seedAdminIfNeeded();



  const app = createApp();



  const restored = await container.schedulerService.restoreScheduledJobs();

  logger.info('Scheduler restored jobs from MongoDB', { count: restored });



  app.listen(config.PORT, () => {

    logger.info(`Server listening on port ${config.PORT}`, {

      env: config.NODE_ENV,

      baseUrl: config.BASE_URL,

      db: config.MONGODB_DB_NAME,

    });

    logger.info(`Health check: ${config.BASE_URL}/health`);

    logger.info(`Telegram webhook: ${config.BASE_URL}/telegram/webhook`);

  });

}



bootstrap().catch((error: unknown) => {

  logger.error('Failed to start server', {

    error: error instanceof Error ? error.message : String(error),

  });

  process.exit(1);

});


