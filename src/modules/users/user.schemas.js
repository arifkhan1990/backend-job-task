import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');
const email = z.string().trim().toLowerCase().email('Enter a valid email').max(254);
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const interests = z.array(z.string().trim().min(1).max(40)).max(20);

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userIdParamSchema = z.object({
  id: objectId,
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password,
  role: z.enum(['user', 'admin']).default('user'),
  interests: interests.default([]),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
    email: email.optional(),
    password: password.optional(),
    role: z.enum(['user', 'admin']).optional(),
    interests: interests.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const groupedInterestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  interest: z.string().trim().toLowerCase().min(1).max(40).optional(),
});

export const userPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
