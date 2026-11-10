import * as Sentry from '@sentry/node';
import { env } from './env.js';

export function initSentry(app) {
  if (!env.sentryDsn) {
    return false;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.nodeEnv === 'production' ? 0.1 : 0,
  });

  Sentry.setupExpressErrorHandler(app);
  return true;
}
