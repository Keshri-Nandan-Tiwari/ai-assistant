import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { globalApiLimiter } from './middleware/rateLimit.js';
import passport, { configurePassport } from './config/passport.js';

import authRoutes from './routes/authRoutes.js';
import oauthRoutes from './routes/oauthRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import attachmentRoutes from './routes/attachmentRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

export function createApp() {
  const app = express();
  configurePassport();

  app.set('trust proxy', 1); // required for correct req.ip behind a load balancer/proxy

  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true, // required for HttpOnly auth cookies
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV === 'production' }));
  app.use('/api', globalApiLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/auth', oauthRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/attachments', attachmentRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/contact', contactRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
