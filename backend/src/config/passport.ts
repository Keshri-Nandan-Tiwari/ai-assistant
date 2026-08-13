import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from './env.js';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

/**
 * OAuth strategies are only registered if their credentials are set.
 * If GOOGLE_CLIENT_ID/SECRET (or GitHub's) are blank, that login button
 * simply won't work — the route returns a clear config error instead of
 * silently failing or faking a login.
 */
async function findOrCreateOAuthUser(
  provider: 'google' | 'github',
  providerUserId: string,
  profile: { email?: string; name?: string; avatarUrl?: string }
) {
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId } },
    include: { user: true },
  });
  if (existingLink) return existingLink.user;

  if (!profile.email) {
    throw new Error(`${provider} did not return an email address`);
  }

  // Link to an existing account with the same verified email, or create a new one
  let user = await prisma.user.findUnique({ where: { email: profile.email } });

  if (!user) {
    const baseUsername = profile.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || provider;
    let username = baseUsername;
    let suffix = 0;
    while (await prisma.user.findUnique({ where: { username } })) {
      suffix += 1;
      username = `${baseUsername}${suffix}`;
    }

    user = await prisma.user.create({
      data: {
        email: profile.email,
        username,
        firstName: profile.name?.split(' ')[0] ?? null,
        lastName: profile.name?.split(' ').slice(1).join(' ') || null,
        avatarUrl: profile.avatarUrl,
        emailVerified: true, // OAuth providers already verified this email
        accountStatus: 'ACTIVE',
        settings: { create: {} },
      },
    });
  }

  await prisma.oAuthAccount.create({ data: { userId: user.id, provider, providerUserId } });
  return user;
}

export function configurePassport() {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${env.API_URL}/api/auth/google/callback`,
        },
        (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          findOrCreateOAuthUser('google', profile.id, {
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          })
            .then((user) => done(null, user))
            .catch((err) => done(err));
        }
      )
    );
    logger.info('Google OAuth strategy registered');
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          callbackURL: `${env.API_URL}/api/auth/github/callback`,
        },
        (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          findOrCreateOAuthUser('github', profile.id, {
            email: profile.emails?.[0]?.value,
            name: profile.displayName ?? profile.username,
            avatarUrl: profile.photos?.[0]?.value,
          })
            .then((user) => done(null, user))
            .catch((err) => done(err));
        }
      )
    );
    logger.info('GitHub OAuth strategy registered');
  }
}

export const isGoogleOAuthConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const isGitHubOAuthConfigured = () => Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

export default passport;
