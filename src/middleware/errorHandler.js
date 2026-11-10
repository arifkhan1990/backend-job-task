import { logger } from '../config/logger.js';

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let code = typeof error.code === 'string' ? error.code : 'INTERNAL_ERROR';
  let message = error.isOperational ? error.message : 'Internal server error';
  let details = error.details;

  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item.message,
    }));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = 'Invalid identifier';
  } else if (error.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    const field = Object.keys(error.keyValue || {})[0] || 'value';
    message = `A record with that ${field} already exists`;
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON payload';
  }

  if (statusCode >= 500) {
    logger.error({ err: error }, 'Unhandled request error');
    code = 'INTERNAL_ERROR';
    message = 'Internal server error';
    details = undefined;
  }

  return res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
