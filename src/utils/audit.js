import { logger } from '../config/logger.js';

export function audit(event) {
  logger.info({ audit: true, ...event }, 'audit');
}
