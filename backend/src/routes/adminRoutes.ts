import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

// Every route below requires an authenticated ADMIN or SUPER_ADMIN user.
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

router.get(
  '/users',
  asyncHandler(async (req: AuthedRequest, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = Number(req.query.page ?? 1);
    const pageSize = 25;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          accountStatus: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page, pageSize } });
  })
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req: AuthedRequest, res) => {
    const schema = z.object({ accountStatus: z.enum(['ACTIVE', 'DISABLED']) });
    const { accountStatus } = schema.parse(req.body);

    if (req.params.id === req.user?.id) {
      throw AppError.badRequest('You cannot change your own account status here');
    }

    const user = await prisma.user.update({ where: { id: req.params.id }, data: { accountStatus } });
    res.json({ success: true, data: { user } });
  })
);

router.get(
  '/stats',
  asyncHandler(async (_req: AuthedRequest, res) => {
    const [totalUsers, activeUsers, totalConversations, totalMessages, usageByModel] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.usageRecord.groupBy({
        by: ['model'],
        _sum: { requestCount: true, inputTokens: true, outputTokens: true },
      }),
    ]);

    res.json({
      success: true,
      data: { totalUsers, activeUsers, totalConversations, totalMessages, usageByModel },
    });
  })
);

router.get(
  '/audit-logs',
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = 50;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { email: true, username: true } } },
    });
    res.json({ success: true, data: { logs, page, pageSize } });
  })
);

export default router;
