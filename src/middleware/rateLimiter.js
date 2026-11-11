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


