import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
type RequestTarget = 'body' | 'query' | 'params';
export declare function validateRequest<T>(schema: ZodSchema<T>, target?: RequestTarget): (req: Request, _res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validate.d.ts.map