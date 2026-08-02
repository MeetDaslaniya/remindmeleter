import { Request, Response, NextFunction } from 'express';
export declare class TelegramController {
    webhook(req: Request, res: Response, _next: NextFunction): Promise<void>;
    webhookInfo(_req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const telegramController: TelegramController;
//# sourceMappingURL=telegram.controller.d.ts.map