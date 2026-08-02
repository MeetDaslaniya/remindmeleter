import bcrypt from 'bcryptjs';

import { config } from '../config';

import { AdminModel } from './models/admin.model';

import { logger } from '../utils/logger';



/**

 * Ensures at least one admin exists.

 * Default email/password come from env (or built-in defaults).

 * Update email/passwordHash directly in MongoDB `admins` collection anytime.

 */

export async function seedAdminIfNeeded(): Promise<void> {

  const email = config.ADMIN_EMAIL.toLowerCase().trim();

  const existing = await AdminModel.findOne({ email }).exec();



  if (existing) {

    logger.info('Admin account already present', { email });

    return;

  }



  const passwordHash = await bcrypt.hash(config.ADMIN_PASSWORD, 12);

  await AdminModel.create({

    email,

    passwordHash,

    name: 'Admin',

    role: 'admin',

  });



  logger.info('Seeded default admin account into MongoDB', { email });

}


