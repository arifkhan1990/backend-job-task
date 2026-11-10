import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSentry } from './config/sentry.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

export const app = express();

app.disable('x-powered-by');
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const requestId = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('x-request-id', requestId);
      return requestId;
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) {
        return 'error';
      }

      return res.statusCode >= 400 ? 'warn' : 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, error) =>
      `${req.method} ${req.url} ${res.statusCode} ${error.message}`,
  }),
);
app.use(helmet());
app.use(cookieParser());
app.use(
  cors({
    origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'notes-api',
    version,
    uptime: process.uptime(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

app.use('/api/v1', apiLimiter, apiRoutes);
app.use(notFound);
initSentry(app);
app.use(errorHandler);
