import { Router } from 'express';
import { systemController } from '../controllers/system.controller';

const router = Router();

router.get('/status', (req, res, next) => {
  void systemController.getStatus(req, res, next);
});

router.post('/webhook/sync', (req, res, next) => {
  void systemController.syncWebhook(req, res, next);
});

export default router;
