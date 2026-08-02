import { Request, Response, NextFunction } from 'express';

import { authService, AdminAuthPayload } from '../services/auth.service';

import { UnauthorizedError } from '../utils/errors';



declare global {

  namespace Express {

    interface Request {

      admin?: AdminAuthPayload;

    }

  }

}



export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {

  try {

    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {

      throw new UnauthorizedError('Login required');

    }



    const token = header.slice('Bearer '.length).trim();

    if (!token) {

      throw new UnauthorizedError('Login required');

    }



    req.admin = authService.verifyToken(token);

    next();

  } catch (error) {

    next(error);

  }

}


