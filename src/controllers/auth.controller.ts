import { Request, Response, NextFunction } from 'express';

import { authService } from '../services/auth.service';

import { sendSuccess } from '../utils/response';

import { UnauthorizedError } from '../utils/errors';



export class AuthController {

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {

      const email = String(req.body?.email ?? '');

      const password = String(req.body?.password ?? '');

      const result = await authService.login(email, password);

      sendSuccess(res, result, 'Logged in');

    } catch (error) {

      next(error);

    }

  }



  async me(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {

      const adminId = req.admin?.id;

      if (!adminId) {

        throw new UnauthorizedError();

      }

      const admin = await authService.getAdminById(adminId);

      if (!admin) {

        throw new UnauthorizedError('Admin not found');

      }

      sendSuccess(res, admin);

    } catch (error) {

      next(error);

    }

  }

}



export const authController = new AuthController();


