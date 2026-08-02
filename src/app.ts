import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    })
  );

  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
