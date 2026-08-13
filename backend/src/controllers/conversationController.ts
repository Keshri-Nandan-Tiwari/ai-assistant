import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import * as conversationService from '../services/conversationService.js';

export const list = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const archived = req.query.archived === 'true';
  const conversations = await conversationService.listConversations(req.user.id, { search, archived });
  res.json({ success: true, data: { conversations } });
});

export const create = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const schema = z.object({ title: z.string().max(200).optional(), model: z.string().optional() });
  const { title, model } = schema.parse(req.body ?? {});
  const conversation = await conversationService.createConversation(req.user.id, title, model);
  res.status(201).json({ success: true, data: { conversation } });
});

export const getMessages = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await conversationService.getMessages(req.user.id, req.params.id, { cursor, limit });
  res.json({ success: true, data: result });
});

export const rename = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { title } = z.object({ title: z.string().min(1).max(200) }).parse(req.body);
  const conversation = await conversationService.renameConversation(req.user.id, req.params.id, title);
  res.json({ success: true, data: { conversation } });
});

export const pin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { pinned } = z.object({ pinned: z.boolean() }).parse(req.body);
  const conversation = await conversationService.togglePin(req.user.id, req.params.id, pinned);
  res.json({ success: true, data: { conversation } });
});

export const archive = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { archived } = z.object({ archived: z.boolean() }).parse(req.body);
  const conversation = await conversationService.toggleArchive(req.user.id, req.params.id, archived);
  res.json({ success: true, data: { conversation } });
});

export const remove = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await conversationService.deleteConversation(req.user.id, req.params.id);
  res.json({ success: true, message: 'Conversation deleted' });
});
