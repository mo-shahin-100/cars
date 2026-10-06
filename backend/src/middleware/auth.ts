import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/db';

const JWT_SECRET = process.env.JWT_SECRET || 'workshop_super_secret_jwt_key_2026';

export interface AuthUser {
  id: string;
  workshop_id: string;
  username: string;
  full_name: string;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: { id: string; workshop_id: string; username: string; full_name: string; role: string }): string {
  return jwt.sign(
    {
      id: user.id,
      workshop_id: user.workshop_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'غير مصرح بالدخول: يرجى تسجيل الدخول أولاً' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch user and permissions fresh from DB
    const userRow = db.prepare(`
      SELECT u.id, u.workshop_id, u.username, u.full_name, u.is_active, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? AND u.deleted_at IS NULL
    `).get(decoded.id) as any;

    if (!userRow || userRow.is_active === 0) {
      return res.status(401).json({ success: false, error: 'الحساب غير موجود أو معطل من قبل الإدارة' });
    }

    // Fetch user permissions
    const permRows = db.prepare(`
      SELECT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.id = ?
    `).all(decoded.id) as { code: string }[];

    req.user = {
      id: userRow.id,
      workshop_id: userRow.workshop_id,
      username: userRow.username,
      full_name: userRow.full_name,
      role: userRow.role,
      permissions: permRows.map(p => p.code)
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'جلسة الدخول منتهية أو غير صالحة' });
  }
}
