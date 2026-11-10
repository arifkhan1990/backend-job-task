import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const skipInTests = () => env.nodeEnv === 'test';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: { message: 'Too many requests. Try again shortly.' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: { message: 'Too many authentication attempts. Try again later.' } },
});
