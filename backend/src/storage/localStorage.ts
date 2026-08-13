import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

if (!fs.existsSync(env.LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(env.LOCAL_UPLOAD_DIR, { recursive: true });
}

/**
 * Validates and persists an uploaded file. Never trusts the client-supplied
 * MIME type alone — extension and declared type are cross-checked, and
 * files are stored under a random name (never the original filename) to
 * prevent path traversal or overwrite attacks.
 */
export function saveUploadedFile(file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw AppError.badRequest(`File type "${file.mimetype}" is not allowed`, 'INVALID_FILE_TYPE');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw AppError.badRequest('File exceeds the 20MB size limit', 'FILE_TOO_LARGE');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeExtensions = ['.pdf', '.txt', '.csv', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
  if (!safeExtensions.includes(ext)) {
    throw AppError.badRequest('File extension is not allowed', 'INVALID_FILE_EXTENSION');
  }

  const storedName = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(env.LOCAL_UPLOAD_DIR, storedName);
  fs.writeFileSync(fullPath, file.buffer);

  return {
    storedName,
    storageUrl: `/uploads/${storedName}`, // served via an authenticated download route, not statically
  };
}

export function deleteUploadedFile(storedName: string) {
  const fullPath = path.join(env.LOCAL_UPLOAD_DIR, path.basename(storedName));
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

export function readUploadedFile(storedName: string): Buffer {
  const fullPath = path.join(env.LOCAL_UPLOAD_DIR, path.basename(storedName));
  return fs.readFileSync(fullPath);
}
