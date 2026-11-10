import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const noteIdParamSchema = z.object({
  id: objectId,
});

export const listNotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ownerId: objectId.optional(),
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(20000),
});

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200).optional(),
    content: z.string().min(1, 'Content is required').max(20000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
