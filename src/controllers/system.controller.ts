import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { sendSuccess } from '../utils/response';

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
}

export const systemController = new SystemController();
