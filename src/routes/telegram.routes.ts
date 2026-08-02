import { Router } from 'express';
import { telegramController } from '../controllers/telegram.controller';
import { telegramWebhookAuth } from '../middleware/telegramAuth';

const router = Router();

router.post('/webhook', telegramWebhookAuth, (req, res, next) => {
  void telegramController.webhook(req, res, next);
});

router.get('/webhook-info', (req, res, next) => {
  void telegramController.webhookInfo(req, res, next);
});

export default router;
