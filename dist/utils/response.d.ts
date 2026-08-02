import { Response } from 'express';
export declare function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number): Response;
export declare function sendError(res: Response, message: string, statusCode?: number, code?: string, details?: unknown): Response;
//# sourceMappingURL=response.d.ts.map