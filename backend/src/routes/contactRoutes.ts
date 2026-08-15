import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { contactFormLimiter } from '../middleware/rateLimit.js';
import { sendContactFormEmail } from '../email/mailer.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(1).max(3000),
});

router.post(
  '/',
  contactFormLimiter,
  asyncHandler(async (req, res) => {
    const input = contactSchema.parse(req.body);

    // Unlike other emails in this app, this one IS the point of the request —
    // if it fails, the sender needs to know so they can try another way to
    // reach out, rather than believing a message was sent when it wasn't.
    try {
      await sendContactFormEmail(input.name, input.email, input.message);
    } catch (err) {
      logger.error({ err }, 'Failed to send contact form email');
      throw AppError.internal('Could not send your message right now — please try again shortly.');
    }

    res.status(200).json({ success: true, message: 'Message sent' });
  })
);

export default router;
