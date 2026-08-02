import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type RequestTarget = 'body' | 'query' | 'params';

export function validateRequest<T>(schema: ZodSchema<T>, target: RequestTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(
        new ValidationError('Request validation failed', result.error.flatten())
      );
      return;
    }

    req[target] = result.data;
    next();
  };
}
