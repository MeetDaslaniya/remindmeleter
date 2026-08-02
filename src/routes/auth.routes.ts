import { Router } from 'express';

import { authController } from '../controllers/auth.controller';

import { requireAdmin } from '../middleware/auth';



const router = Router();



router.post('/login', (req, res, next) => {

  void authController.login(req, res, next);

});



router.get('/me', requireAdmin, (req, res, next) => {

  void authController.me(req, res, next);

});



export default router;


