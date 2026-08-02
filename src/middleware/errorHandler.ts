import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  if (err instanceof ZodError) {
    return sendError(res, 'Request validation failed', 400, 'VALIDATION_ERROR', err.flatten());
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  return sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}

export function notFoundHandler(req: Request, res: Response): Response {
  return sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
}
