import { env } from '../config/env.js';

export const REFRESH_COOKIE = 'refresh_token';
export const CSRF_COOKIE = 'csrf_token';

const refreshMaxAge = env.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
const baseOptions = {
  sameSite: env.cookieSameSite,
  secure: env.cookieSecure,
};

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions,
    httpOnly: true,
    path: '/api/v1/auth',
    maxAge: refreshMaxAge,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    ...baseOptions,
    httpOnly: true,
    path: '/api/v1/auth',
  });
}

export function setCsrfCookie(res, token) {
  res.cookie(CSRF_COOKIE, token, {
    ...baseOptions,
    httpOnly: false,
    path: '/',
    maxAge: refreshMaxAge,
  });
}

export function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE, {
    ...baseOptions,
    httpOnly: false,
    path: '/',
  });
}
