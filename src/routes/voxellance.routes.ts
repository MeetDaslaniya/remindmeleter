import { Router } from 'express';
import { voxellanceController } from '../controllers/voxellance.controller';

const router = Router();

// POST /api/voxellance/create - Create a new user with username, password, allowed
router.post('/create', (req, res, next) => {
  void voxellanceController.create(req, res, next);
});

// POST /api/voxellance/login - Login user and verify allowed status
router.post('/login', (req, res, next) => {
  void voxellanceController.login(req, res, next);
});

export default router;
