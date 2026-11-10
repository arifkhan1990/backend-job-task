import { ApiError } from '../utils/ApiError.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return next(new ApiError(400, 'Validation failed', details, 'VALIDATION_ERROR'));
  }

  req[source] = result.data;
  return next();
};
