import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

declare global {
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret);
    req.user = payload as jwt.JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
