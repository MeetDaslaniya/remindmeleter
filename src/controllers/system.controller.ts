import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class SystemController {
  async getStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await container.systemService.getSystemStatus();
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  async syncWebhook(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await container.systemService.syncWebhook();
      sendSuccess(res, result, 'Telegram webhook updated from BASE_URL');
    } catch (error) {
      next(error);
    }
  }

  async setBaseUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as { baseUrl?: string };
      if (!body?.baseUrl || typeof body.baseUrl !== 'string') {
        throw new ValidationError('baseUrl is required');
      }

      const baseUrl = container.systemService.setBaseUrl(body.baseUrl);
      sendSuccess(
        res,
        { baseUrl },
        'Runtime BASE_URL updated (in-memory, non-persistent)'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const systemController = new SystemController();
