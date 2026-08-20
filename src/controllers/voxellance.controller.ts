import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { VoxellanceModel } from '../db/models/voxellance.model';
import { sendSuccess, sendError } from '../utils/response';

export class VoxellanceController {
  /**
   * Create a new Voxellance user record
   * Body: { username, password, allowed } (allowed defaults to true)
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = String(req.body?.username ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '').trim();
      const allowed = typeof req.body?.allowed === 'boolean' ? req.body.allowed : true;

      if (!username || !password) {
        sendError(res, 'username and password are required', 400);
        return;
      }

      const existing = await VoxellanceModel.findOne({ username });
      if (existing) {
        sendError(res, 'User with this username already exists', 409);
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await VoxellanceModel.create({
        username,
        password: hashedPassword,
        allowed,
      });

      sendSuccess(
        res,
        {
          id: user._id,
          username: user.username,
          allowed: user.allowed,
          createdAt: user.createdAt,
        },
        'User created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login with username and password
   * Body: { username, password }
   * If credentials match and allowed is true -> returns allowed: true
   * If credentials invalid or allowed is false -> returns allowed: false
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = String(req.body?.username ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '').trim();

      if (!username || !password) {
        res.status(400).json({
          success: false,
          allowed: false,
          message: 'username and password are required',
        });
        return;
      }

      const user = await VoxellanceModel.findOne({ username });
      if (!user) {
        res.status(401).json({
          success: false,
          allowed: false,
          message: 'Invalid username or password',
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          allowed: false,
          message: 'Invalid username or password',
        });
        return;
      }

      if (!user.allowed) {
        res.status(403).json({
          success: false,
          allowed: false,
          message: 'Access denied: user is not allowed',
        });
        return;
      }

      res.status(200).json({
        success: true,
        allowed: true,
        message: 'Login successful',
        data: {
          id: user._id,
          username: user.username,
          allowed: user.allowed,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const voxellanceController = new VoxellanceController();
