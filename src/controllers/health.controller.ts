import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { sendSuccess } from '../utils/response';

export class HealthController {
  async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await container.healthService.getStatus();
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }
}

export const healthController = new HealthController();
