import type { Response } from 'express';
import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

// In production the frontend and backend live on different origins (e.g.
// separate onrender.com subdomains), which browsers treat as cross-site.
// Cross-site fetches only carry cookies when SameSite=None + Secure is set;
// SameSite=Lax (fine for same-site/local dev) is silently dropped on them.
const cookieSameSite = isProd ? ('none' as const) : ('lax' as const);

// HttpOnly + Secure + SameSite cookies: the tokens are never reachable
// from JavaScript, which closes off the most common XSS-driven token theft.
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: cookieSameSite,
    domain: env.COOKIE_DOMAIN,
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: cookieSameSite,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}
