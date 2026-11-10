import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email').max(254);
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const interests = z.array(z.string().trim().min(1).max(40)).max(20);

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password,
  interests: interests.default([]),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
    interests: interests.optional(),
    password: password.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
