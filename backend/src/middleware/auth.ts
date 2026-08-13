import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../config/prisma.js';

export interface AuthedRequest extends Request {
  user?: { id: string; role: string };
}

/**
 * Verifies the access token (read from an HttpOnly cookie) and attaches
 * the authenticated user's id/role to the request. Rejects disabled
 * or deleted accounts even if the token itself is still technically valid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authedReq = req as AuthedRequest;
  try {
    const token = authedReq.cookies?.access_token as string | undefined;
    if (!token) throw AppError.unauthorized();

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, accountStatus: true },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw AppError.unauthorized('Account is not active');
    }

    authedReq.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(AppError.unauthorized('Invalid or expired session'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authedReq = req as AuthedRequest;
    if (!authedReq.user || !roles.includes(authedReq.user.role)) {
      return next(AppError.forbidden());
    }
    next();
  };
}

/**
 * Verifies resource ownership: ensures req.user.id matches the given
 * owner id. Use this in every controller that loads a user-scoped
 * resource (conversations, attachments, etc.) to prevent IDOR.
 */
export function assertOwnership(userId: string | undefined, resourceOwnerId: string) {
  if (!userId || userId !== resourceOwnerId) {
    throw AppError.forbidden("You don't have access to this resource");
  }
}
