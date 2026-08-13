import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../config/prisma.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { revokeAllSessions, logAudit } from '../services/authService.js';
import { clearAuthCookies } from '../utils/cookies.js';

const router = Router();
router.use(requireAuth);

router.patch(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    const schema = z.object({
      firstName: z.string().min(1).max(50).optional(),
      lastName: z.string().min(1).max(50).optional(),
      avatarUrl: z.string().url().optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ success: true, data: { user } });
  })
);

router.post(
  '/change-password',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.passwordHash) throw AppError.badRequest('This account uses OAuth sign-in only');

    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) throw AppError.unauthorized('Current password is incorrect', 'INVALID_CREDENTIALS');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await revokeAllSessions(user.id);
    await logAudit(user.id, 'PASSWORD_CHANGED', {});

    clearAuthCookies(res);
    res.json({ success: true, message: 'Password changed. Please log in again.' });
  })
);

router.get(
  '/settings',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: {},
      create: { userId: req.user.id },
    });
    res.json({ success: true, data: { settings } });
  })
);

router.patch(
  '/settings',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    const schema = z.object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      accentColor: z.string().max(30).optional(),
      language: z.string().max(10).optional(),
      defaultModel: z.string().max(50).optional(),
      notificationPreferences: z.record(z.any()).optional(),
    });
    const data = schema.parse(req.body);
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    });
    res.json({ success: true, data: { settings } });
  })
);

router.delete(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    const schema = z.object({ confirmation: z.literal('DELETE') });
    schema.parse(req.body);

    await logAudit(req.user.id, 'ACCOUNT_DELETED', {});
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        accountStatus: 'DELETED',
        email: `deleted+${req.user.id}@deleted.local`,
        username: `deleted_${req.user.id}`,
        passwordHash: null,
      },
    });
    await revokeAllSessions(req.user.id);
    clearAuthCookies(res);
    res.json({ success: true, message: 'Account deleted' });
  })
);

export default router;
