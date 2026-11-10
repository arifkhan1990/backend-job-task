import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Rate limits protect the deployed API. Local development and the test suite
// deliberately skip them so page reloads and repeat runs are not throttled.
const skipOutsideProduction = () => env.nodeEnv !== 'production';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipOutsideProduction,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipOutsideProduction,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Try again later.',
    },
  },
});

// Refresh/CSRF traffic is normal session maintenance, not a brute-force target.
// Keep it bounded without sharing the strict login budget.
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipOutsideProduction,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many session requests. Try again shortly.',
    },
  },
});
