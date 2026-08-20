import { Request, Response, NextFunction } from 'express';
export declare class SystemController {
    getStatus(_req: Request, res: Response, next: NextFunction): Promise<void>;
    syncWebhook(_req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const systemController: SystemController;
//# sourceMappingURL=system.controller.d.ts.map