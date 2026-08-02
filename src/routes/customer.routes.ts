import { Router } from 'express';

import { customerController } from '../controllers/customer.controller';



const router = Router();



router.get('/', (req, res, next) => {

  void customerController.list(req, res, next);

});



router.get('/stats', (req, res, next) => {

  void customerController.stats(req, res, next);

});



export default router;


