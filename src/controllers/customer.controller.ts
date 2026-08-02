import { Request, Response, NextFunction } from 'express';

import { container } from '../config/container';

import { sendSuccess } from '../utils/response';



export class CustomerController {

  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {

    try {

      const customers = await container.customerService.getAll();

      sendSuccess(res, customers);

    } catch (error) {

      next(error);

    }

  }



  async stats(_req: Request, res: Response, next: NextFunction): Promise<void> {

    try {

      const stats = await container.customerService.getStats();

      sendSuccess(res, stats);

    } catch (error) {

      next(error);

    }

  }

}



export const customerController = new CustomerController();


