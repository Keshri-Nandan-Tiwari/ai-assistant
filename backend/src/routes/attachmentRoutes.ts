import { Router } from 'express';
import multer from 'multer';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';
import { saveUploadedFile, readUploadedFile, deleteUploadedFile } from '../storage/localStorage.js';
import { prisma } from '../config/prisma.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();
router.use(requireAuth);

router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    if (!req.file) throw AppError.badRequest('No file uploaded');

    const { storedName, storageUrl } = saveUploadedFile({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
    });

    const conversationId = typeof req.body.conversationId === 'string' ? req.body.conversationId : undefined;

    const attachment = await prisma.attachment.create({
      data: {
        userId: req.user.id,
        conversationId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storageUrl: storedName, // internal reference; storageUrl for client built from /api route below
      },
    });

    res.status(201).json({
      success: true,
      data: { attachment: { ...attachment, downloadUrl: `/api/attachments/${attachment.id}/download` } },
    });
  })
);

router.get(
  '/:id/download',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) throw AppError.notFound('Attachment not found');
    if (attachment.userId !== req.user.id) throw AppError.forbidden(); // ownership check — prevents IDOR

    const buffer = readUploadedFile(attachment.storageUrl);
    res.setHeader('Content-Type', attachment.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.send(buffer);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) throw AppError.notFound('Attachment not found');
    if (attachment.userId !== req.user.id) throw AppError.forbidden();

    deleteUploadedFile(attachment.storageUrl);
    await prisma.attachment.delete({ where: { id: attachment.id } });
    res.json({ success: true, message: 'Attachment deleted' });
  })
);

export default router;
