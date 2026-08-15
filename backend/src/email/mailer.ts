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
      // Fail fast rather than hanging the request that triggered the email.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    })
  : null;

async function send(to: string, subject: string, html: string, devLink?: string) {
  if (!transporter) {
    // No SMTP configured — log instead of pretending the email sent.
    // This is intentional: we never fake a successful send.
    logger.warn(
      { to, subject, link: devLink },
      'MAIL_HOST not configured — email NOT sent. Link logged below for manual use. Set MAIL_HOST/MAIL_USERNAME/MAIL_PASSWORD in .env to enable real email delivery.'
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
    `<p>Hi ${name},</p><p>Please verify your email by clicking the link below. This link expires in 24 hours.</p><p><a href="${link}">${link}</a></p>`,
    link
  );
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${env.APP_URL}/reset-password?token=${token}`;
  return send(
    to,
    'Reset your password',
    `<p>Hi ${name},</p><p>We received a request to reset your password. This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.</p><p><a href="${link}">${link}</a></p>`,
    link
  );
}

export async function sendWelcomeEmail(to: string, name: string) {
  return send(
    to,
    `Welcome, ${name}!`,
    `<p>Hi ${name},</p><p>Your account on <strong>Keshri</strong> has just been created with this email address (${to}). You're all set — you can log in and start chatting right away.</p><p>If you didn't create this account, you can safely ignore this email.</p><p><a href="${env.APP_URL}">${env.APP_URL}</a></p>`
  );
}

// Site owner's inbox for the public "Contact" form on the landing page —
// separate from any user's own email, this always goes to the developer.
export async function sendContactFormEmail(fromName: string, fromEmail: string, message: string) {
  return send(
    'keshrinandantiwari08@gmail.com',
    `New message from ${fromName} (Keshri contact form)`,
    `<p><strong>From:</strong> ${fromName} (${fromEmail})</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`
  );
}
