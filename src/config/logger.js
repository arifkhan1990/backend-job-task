import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.logLevel,
  base: { service: 'notes-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'password',
      '*.password',
      'token',
      '*.token',
    ],
    censor: '[redacted]',
  },
});
