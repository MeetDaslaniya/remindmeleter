import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export class TelegramController {
  async webhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Acknowledge immediately — Telegram expects a fast 200
      res.sendStatus(200);

      await container.telegramWebhookService.handleUpdate(req.body);
    } catch (error) {
      logger.error('Telegram webhook handler error', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Response already sent; avoid next() after headers
    }
  }

  async webhookInfo(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const info = await container.telegramProvider.getWebhookInfo();
      sendSuccess(res, info);
    } catch (error) {
      next(error);
    }
  }
}

export const telegramController = new TelegramController();
