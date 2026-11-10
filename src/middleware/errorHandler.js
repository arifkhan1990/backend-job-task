export function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let message = error.isOperational ? error.message : 'Internal server error';
  let details = error.details;

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item.message,
    }));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier';
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || {})[0] || 'value';
    message = `A record with that ${field} already exists`;
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  if (statusCode >= 500) {
    console.error(error);
    message = 'Internal server error';
    details = undefined;
  }

  return res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}
