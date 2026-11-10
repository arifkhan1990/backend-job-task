import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(20000),
});
