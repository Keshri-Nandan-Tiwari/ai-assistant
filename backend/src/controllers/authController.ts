import type { Response } from 'express';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validation/authSchemas.js';
import * as authService from '../services/authService.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthedRequest } from '../middleware/auth.js';

function toDto(user: { id: string; email: string; username: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; role: string; emailVerified: boolean; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export const register = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const input = registerSchema.parse(req.body);
  const user = await authService.registerUser(input);

  // Accounts are active immediately, so log the person straight in —
  // no separate "verify then log in" step to get stuck on.
  const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const { accessToken, refreshToken } = await authService.issueTokenPair(user.id, user.role, meta);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    data: { user: toDto(user) },
    message: 'Account created',
  });
});

export const login = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const input = loginSchema.parse(req.body);
  const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const { user, accessToken, refreshToken } = await authService.loginUser(input, meta);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ success: true, data: { user: toDto(user) }, message: 'Logged in successfully' });
});

export const refresh = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const rawToken = req.cookies?.refresh_token as string | undefined;
  if (!rawToken) throw AppError.unauthorized('No refresh token provided');
  const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const { accessToken, refreshToken } = await authService.rotateRefreshToken(rawToken, meta);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ success: true, message: 'Session refreshed' });
});

export const logout = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const rawToken = req.cookies?.refresh_token as string | undefined;
  if (rawToken) await authService.revokeRefreshToken(rawToken);
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out' });
});

export const logoutAll = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await authService.revokeAllSessions(req.user.id);
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out of all devices' });
});

export const verifyEmail = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { token } = verifyEmailSchema.parse(req.body);
  await authService.verifyEmail(token);
  res.json({ success: true, message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(email);
  // Always return the same generic message — never reveal account existence
  res.json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  res.json({ success: true, message: 'Password reset successfully. Please log in.' });
});

export const me = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { prisma } = await import('../config/prisma.js');
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw AppError.notFound('User not found');
  res.json({ success: true, data: { user: toDto(user) } });
});
