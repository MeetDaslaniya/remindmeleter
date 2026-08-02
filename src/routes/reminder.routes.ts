import { Router } from 'express';
import { z } from 'zod';
import { reminderController } from '../controllers/reminder.controller';
import { validateRequest } from '../middleware/validate';

const idParamsSchema = z.object({
  // MongoDB ObjectId (24 hex) or legacy UUID from in-memory era
  id: z
    .string()
    .min(1)
    .refine(
      (value) =>
        /^[a-f\d]{24}$/i.test(value) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value
        ),
      { message: 'Invalid reminder id' }
    ),
});

const router = Router();

router.get('/', (req, res, next) => {
  void reminderController.list(req, res, next);
});

router.get('/stats', (req, res, next) => {
  void reminderController.stats(req, res, next);
});

router.get('/analytics', (req, res, next) => {
  void reminderController.analytics(req, res, next);
});

router.post('/test', (req, res, next) => {
  void reminderController.createTest(req, res, next);
});

router.get('/:id', validateRequest(idParamsSchema, 'params'), (req, res, next) => {
  void reminderController.getById(req, res, next);
});

router.delete('/:id', validateRequest(idParamsSchema, 'params'), (req, res, next) => {
  void reminderController.remove(req, res, next);
});

router.post('/:id/cancel', validateRequest(idParamsSchema, 'params'), (req, res, next) => {
  void reminderController.cancel(req, res, next);
});

export default router;
