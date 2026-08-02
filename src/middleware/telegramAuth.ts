import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

export function telegramWebhookAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const secret = req.headers['x-telegram-bot-api-secret-token'];

  if (secret !== config.TELEGRAM_WEBHOOK_SECRET) {
    next(new UnauthorizedError('Invalid Telegram webhook secret'));
    return;
  }

  next();
}
