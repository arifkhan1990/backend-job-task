import crypto from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';
import { CSRF_COOKIE, setCsrfCookie } from '../utils/cookies.js';
import { generateCsrfToken } from '../utils/tokens.js';

export function issueCsrfToken(res) {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  return token;
}

export function requireCsrf(req, _res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken) {
    return next(new ApiError(403, 'Invalid CSRF token', undefined, 'CSRF_ERROR'));
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    return next(new ApiError(403, 'Invalid CSRF token', undefined, 'CSRF_ERROR'));
  }

  return next();
}
