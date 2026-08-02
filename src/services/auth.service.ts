import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';

import { config } from '../config';

import { AdminModel } from '../db/models/admin.model';

import { UnauthorizedError, ValidationError } from '../utils/errors';



export interface AdminAuthPayload {

  id: string;

  email: string;

  name: string;

  role: string;

}



export interface LoginResult {

  token: string;

  admin: AdminAuthPayload;

}



export class AuthService {

  async login(email: string, password: string): Promise<LoginResult> {

    const normalized = email.toLowerCase().trim();

    if (!normalized || !password) {

      throw new ValidationError('Email and password are required');

    }



    const admin = await AdminModel.findOne({ email: normalized }).exec();

    if (!admin) {

      throw new UnauthorizedError('Invalid email or password');

    }



    const ok = await bcrypt.compare(password, admin.passwordHash);

    if (!ok) {

      throw new UnauthorizedError('Invalid email or password');

    }



    const payload: AdminAuthPayload = {

      id: String(admin._id),

      email: admin.email,

      name: admin.name || 'Admin',

      role: admin.role || 'admin',

    };



    const token = jwt.sign(
      { id: payload.id, email: payload.email, name: payload.name, role: payload.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );



    return { token, admin: payload };

  }



  verifyToken(token: string): AdminAuthPayload {

    try {

      const decoded = jwt.verify(token, config.JWT_SECRET) as AdminAuthPayload;

      return {

        id: decoded.id,

        email: decoded.email,

        name: decoded.name,

        role: decoded.role,

      };

    } catch {

      throw new UnauthorizedError('Invalid or expired token');

    }

  }



  async getAdminById(id: string): Promise<AdminAuthPayload | null> {

    const admin = await AdminModel.findById(id).exec();

    if (!admin) {

      return null;

    }

    return {

      id: String(admin._id),

      email: admin.email,

      name: admin.name || 'Admin',

      role: admin.role || 'admin',

    };

  }

}



export const authService = new AuthService();


