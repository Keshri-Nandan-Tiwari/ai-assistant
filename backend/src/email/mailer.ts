import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const isConfigured = Boolean(env.MAIL_HOST && env.MAIL_USERNAME && env.MAIL_PASSWORD);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: env.MAIL_PORT ?? 587,
      secure: env.MAIL_PORT === 465,
      auth: { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD },
    })
  : null;

async function send(to: string, subject: string, html: string) {
  if (!transporter) {
    // No SMTP configured — log instead of pretending the email sent.
    // This is intentional: we never fake a successful send.
    logger.warn(
      { to, subject },
      'MAIL_HOST not configured — email NOT sent. Set MAIL_HOST/MAIL_USERNAME/MAIL_PASSWORD in .env to enable real email delivery.'
    );
    return { sent: false as const };
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
  return { sent: true as const };
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${env.APP_URL}/verify-email?token=${token}`;
  return send(
    to,
    'Verify your email address',
    `<p>Hi ${name},</p><p>Please verify your email by clicking the link below. This link expires in 24 hours.</p><p><a href="${link}">${link}</a></p>`
  );
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${env.APP_URL}/reset-password?token=${token}`;
  return send(
    to,
    'Reset your password',
    `<p>Hi ${name},</p><p>We received a request to reset your password. This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.</p><p><a href="${link}">${link}</a></p>`
  );
}
