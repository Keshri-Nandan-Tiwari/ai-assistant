import rateLimit from 'express-rate-limit';

const jsonHandler = (message: string) => (req: any, res: any) => {
  res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message },
    timestamp: new Date().toISOString(),
  });
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many login attempts. Please try again in 15 minutes.'),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: jsonHandler('Too many accounts created from this network. Try again later.'),
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: jsonHandler('Too many password reset requests. Try again later.'),
});

export const verificationResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  handler: jsonHandler('Please wait before requesting another verification email.'),
});

export const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  handler: jsonHandler('You are sending messages too quickly. Please slow down.'),
});

export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  handler: jsonHandler('Too many requests. Please slow down.'),
});
