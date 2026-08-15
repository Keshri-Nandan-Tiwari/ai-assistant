import { logger } from '../config/logger.js';

/**
 * Extracts plain text from an uploaded file's buffer, for the file types we
 * can meaningfully read. Returns null (not an error) for types we can't
 * extract text from — the file is still stored and downloadable either way,
 * it just won't be searchable/readable by the AI.
 *
 * Images are intentionally not OCR'd here — that needs either a vision-
 * capable model or a separate OCR service, neither of which is wired up.
 */
export async function extractText(buffer: Buffer, mimetype: string): Promise<string | null> {
  try {
    if (mimetype === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(buffer);
      return result.text.trim() || null;
    }

    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim() || null;
    }

    if (mimetype === 'text/plain' || mimetype === 'text/csv') {
      return buffer.toString('utf-8').trim() || null;
    }

    return null;
  } catch (err) {
    logger.error({ err, mimetype }, 'Text extraction failed for uploaded file');
    return null;
  }
}

/** Splits long text into overlap-free chunks for storage/retrieval. */
export function chunkText(text: string, maxChars = 1500): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxChars));
    i += maxChars;
  }
  return chunks;
}
