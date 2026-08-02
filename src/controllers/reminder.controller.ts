import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { container } from '../config/container';
import { sendSuccess } from '../utils/response';

const testReminderSchema = z.object({
  chatId: z.string().optional(),
  telegramUserId: z.string().optional(),
  reason: z.string().optional(),
  datetime: z.string().optional(),
  timezone: z.string().optional(),
  originalMessage: z.string().optional(),
});

export class ReminderController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reminders = await container.reminderService.getAll();
      sendSuccess(res, reminders);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reminder = await container.reminderService.getById(req.params.id as string);
      sendSuccess(res, reminder);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await container.reminderService.delete(req.params.id as string);
      sendSuccess(res, null, 'Reminder deleted');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reminder = await container.reminderService.cancel(req.params.id as string);
      sendSuccess(res, reminder, 'Reminder cancelled');
    } catch (error) {
      next(error);
    }
  }

  async stats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await container.reminderService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async analytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await container.reminderService.getAnalytics();
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async createTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = testReminderSchema.parse(req.body ?? {});
      const reminder = await container.reminderService.createTestReminder(body);
      sendSuccess(res, reminder, 'Test reminder scheduled', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const reminderController = new ReminderController();
