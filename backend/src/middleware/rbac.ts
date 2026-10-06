import { Request, Response, NextFunction } from 'express';

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'غير مصرح بالدخول' });
    }

    if (allowedRoles.includes(req.user.role) || req.user.role === 'owner') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'ليس لديك الصلاحية الكافية للوصول إلى هذا القسم (يتطلب دور أعلى)'
    });
  };
}

export function requirePermission(permissionCode: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'غير مصرح بالدخول' });
    }

    // Owner has unrestricted access
    if (req.user.role === 'owner') {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permissionCode)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `ليس لديك الصلاحية لتنفيذ هذا الإجراء [${permissionCode}]`
    });
  };
}
