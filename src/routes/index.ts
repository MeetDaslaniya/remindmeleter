import { Router } from 'express';

import healthRoutes from './health.routes';

import telegramRoutes from './telegram.routes';

import reminderRoutes from './reminder.routes';

import systemRoutes from './system.routes';

import customerRoutes from './customer.routes';

import authRoutes from './auth.routes';

import { requireAdmin } from '../middleware/auth';



const router = Router();



router.use('/health', healthRoutes);

router.use('/telegram', telegramRoutes);

router.use('/api/auth', authRoutes);



// Admin-only APIs

router.use('/api/reminders', requireAdmin, reminderRoutes);

router.use('/api/customers', requireAdmin, customerRoutes);

router.use('/api/system', requireAdmin, systemRoutes);



export default router;


