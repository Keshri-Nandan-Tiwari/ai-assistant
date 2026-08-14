import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  generateOpaqueToken,
  hashToken,
  refreshTokenExpiry,
} from '../utils/tokens.js';
import { AppError } from '../utils/AppError.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../email/mailer.js';
import { logger } from '../config/logger.js';
import type { RegisterInput, LoginInput } from '../validation/authSchemas.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function registerUser(input: RegisterInput) {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    // Generic message — don't reveal which field collided in detail beyond "in use"
    throw AppError.conflict('An account with this email already exists', 'EMAIL_IN_USE');
  }
  const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
  if (existingUsername) {
    throw AppError.conflict('This username is already taken', 'USERNAME_IN_USE');
  }

  const passwordHash = await hashPassword(input.password);

  // Accounts are active immediately — no email verification gate.
  // (Real email delivery isn't reliably configured, and forcing every new
  // user to wait on an email step just to log in was more fragile than
  // it was worth for this app.)
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      accountStatus: 'ACTIVE',
      emailVerified: true,
      settings: { create: {} },
    },
  });

  // Welcome email is purely informational — never let it block or fail
  // account creation (same reasoning as elsewhere: SMTP hiccups shouldn't
  // break the request that already succeeded).
  try {
    await sendWelcomeEmail(user.email, user.firstName ?? user.username);
  } catch (err) {
    logger.error({ err, email: user.email }, 'Failed to send welcome email');
  }

  return user;
}

export async function issueEmailVerification(userId: string, email: string, name: string) {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  // Email delivery is best-effort: the account and its verification token
  // are already saved above, so a slow/unreachable SMTP server must never
  // fail (or hang) the registration request itself. The link is always
  // recoverable afterwards (server logs, or a future resend endpoint).
  try {
    await sendVerificationEmail(email, name, token);
  } catch (err) {
    logger.error({ err, email }, 'Failed to send verification email');
  }
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
  });
  if (!record) throw AppError.badRequest('This verification link is invalid or has expired', 'INVALID_TOKEN');

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true, accountStatus: 'ACTIVE' },
    }),
  ]);
}

export async function loginUser(input: LoginInput, meta: { ip?: string; userAgent?: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Constant-shape response whether or not the user exists, to avoid
  // leaking account existence via timing/response differences where possible.
  if (!user || !user.passwordHash) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw AppError.tooManyRequests(
      `Account temporarily locked due to failed login attempts. Try again after ${user.lockedUntil.toLocaleTimeString()}.`,
      'ACCOUNT_LOCKED'
    );
  }

  const valid = await verifyPassword(user.passwordHash, input.password);

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      },
    });
    await logAudit(user.id, 'LOGIN_FAILED', meta);
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw AppError.forbidden(
      user.accountStatus === 'PENDING_VERIFICATION'
        ? 'Please verify your email before logging in'
        : 'This account is disabled',
      'ACCOUNT_NOT_ACTIVE'
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role, meta);
  await logAudit(user.id, 'LOGIN_SUCCESS', meta);

  return { user, accessToken, refreshToken };
}

export async function issueTokenPair(
  userId: string,
  role: string,
  meta: { ip?: string; userAgent?: string }
) {
  const accessToken = signAccessToken(userId, role);
  const refreshToken = generateOpaqueToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  return { accessToken, refreshToken };
}

/** Rotates a refresh token: the old one is revoked and a new pair is issued. */
export async function rotateRefreshToken(rawToken: string, meta: { ip?: string; userAgent?: string }) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!record) throw AppError.unauthorized('Session expired, please log in again', 'INVALID_REFRESH_TOKEN');

  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });

  if (record.user.accountStatus !== 'ACTIVE') {
    throw AppError.unauthorized('Account is not active', 'ACCOUNT_NOT_ACTIVE');
  }

  return issueTokenPair(record.user.id, record.user.role, meta);
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
}

export async function revokeAllSessions(userId: string) {
  await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave identically whether or not the account exists.
  if (!user) return;

  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
  });

  // Same reasoning as registration: never let SMTP trouble break the request.
  try {
    await sendPasswordResetEmail(user.email, user.firstName ?? user.username, token);
  } catch (err) {
    logger.error({ err, email: user.email }, 'Failed to send password reset email');
  }

  await logAudit(user.id, 'PASSWORD_RESET_REQUESTED', {});
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
  });
  if (!record) throw AppError.badRequest('This reset link is invalid or has expired', 'INVALID_TOKEN');

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Invalidate every existing session — a leaked/guessed password shouldn't
    // leave old sessions valid, and this also boots out whoever reset it if it wasn't the owner.
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
  ]);

  await logAudit(record.userId, 'PASSWORD_RESET_COMPLETED', {});
}

export async function logAudit(
  userId: string | null,
  action: string,
  meta: { ip?: string; userAgent?: string; metadata?: Record<string, unknown> }
) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      ...(meta.metadata !== undefined && { metadata: meta.metadata as Prisma.InputJsonValue }),
    },
  });
}
