import { Request, Response, NextFunction } from 'express';
export declare class ReminderController {
    list(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    remove(req: Request, res: Response, next: NextFunction): Promise<void>;
    cancel(req: Request, res: Response, next: NextFunction): Promise<void>;
    stats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    analytics(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createTest(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const reminderController: ReminderController;
//# sourceMappingURL=reminder.controller.d.ts.map