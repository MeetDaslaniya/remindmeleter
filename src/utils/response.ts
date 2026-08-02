import { Response } from 'express';
import { ApiErrorResponse, ApiSuccessResponse } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: unknown
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      message,
      ...(code ? { code } : {}),
      ...(details !== undefined ? { details } : {}),
    },
  };
  return res.status(statusCode).json(body);
}
