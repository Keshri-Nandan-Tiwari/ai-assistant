import { Router } from 'express';
import passport, { isGoogleOAuthConfigured, isGitHubOAuthConfigured } from '../config/passport.js';
import { issueTokenPair } from '../services/authService.js';
import { setAuthCookies } from '../utils/cookies.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

router.get('/google', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(`${env.APP_URL}/login?error=google_not_configured`);
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_failed' }),
  asyncHandler(async (req, res) => {
    const user = req.user as { id: string; role: string };
    if (!user) throw AppError.unauthorized('Google authentication failed');
    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setAuthCookies(res, accessToken, refreshToken);
    res.redirect(`${env.APP_URL}/chat`);
  })
);

router.get('/github', (req, res, next) => {
  if (!isGitHubOAuthConfigured()) {
    return res.redirect(`${env.APP_URL}/login?error=github_not_configured`);
  }
  passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);
});

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login?error=github_failed' }),
  asyncHandler(async (req, res) => {
    const user = req.user as { id: string; role: string };
    if (!user) throw AppError.unauthorized('GitHub authentication failed');
    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setAuthCookies(res, accessToken, refreshToken);
    res.redirect(`${env.APP_URL}/chat`);
  })
);

export default router;
