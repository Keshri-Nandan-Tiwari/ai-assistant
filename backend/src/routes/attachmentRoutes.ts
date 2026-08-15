import { Router } from 'express';
import multer from 'multer';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';
import { saveUploadedFile, readUploadedFile, deleteUploadedFile } from '../storage/localStorage.js';
import { extractText, chunkText } from '../services/fileExtraction.js';
import { logger } from '../config/logger.js';
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

    // Best-effort: extract and index text so this file can be read/searched
    // in chat. A failure here never breaks the upload itself — the file is
    // already safely saved above regardless of extraction outcome.
    let indexed = false;
    try {
      const text = await extractText(req.file.buffer, req.file.mimetype);
      if (text) {
        const source = await prisma.knowledgeSource.create({
          data: {
            userId: req.user.id,
            attachmentId: attachment.id,
            title: req.file.originalname,
            sourceType: 'file',
            status: 'indexed',
          },
        });
        const chunks = chunkText(text);
        await prisma.knowledgeChunk.createMany({
          data: chunks.map((content, i) => ({
            knowledgeSourceId: source.id,
            content,
            chunkIndex: i,
          })),
        });
        indexed = true;
      }
    } catch (err) {
      logger.error({ err, fileName: req.file.originalname }, 'Failed to index uploaded file');
    }

    res.status(201).json({
      success: true,
      data: {
        attachment: {
          ...attachment,
          downloadUrl: `/api/attachments/${attachment.id}/download`,
          indexed, // lets the frontend show "Keshri can read this" vs not
        },
      },
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
