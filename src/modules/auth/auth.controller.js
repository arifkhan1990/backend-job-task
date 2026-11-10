import { issueCsrfToken } from '../../middleware/csrf.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  REFRESH_COOKIE,
  clearCsrfCookie,
  clearRefreshCookie,
  setRefreshCookie,
} from '../../utils/cookies.js';
import * as authService from './auth.service.js';

function readRefreshCookie(req) {
  return req.cookies?.[REFRESH_COOKIE];
}

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerUser(req.body);

  setRefreshCookie(res, refreshToken);
  const csrfToken = issueCsrfToken(res);

  res.status(201).json({
    data: { user: user.toJSON(), accessToken, csrfToken },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);

  setRefreshCookie(res, refreshToken);
  const csrfToken = issueCsrfToken(res);

  res.json({
    data: { user: user.toJSON(), accessToken, csrfToken },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = readRefreshCookie(req);

  if (!rawToken) {
    throw new ApiError(401, 'Refresh token required', undefined, 'REFRESH_TOKEN_REQUIRED');
  }

  const { user, accessToken, refreshToken } =
    await authService.rotateRefreshToken(rawToken);

  setRefreshCookie(res, refreshToken);
  const csrfToken = issueCsrfToken(res);

  res.json({
    data: { user: user.toJSON(), accessToken, csrfToken },
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(readRefreshCookie(req));
  clearRefreshCookie(res);
  clearCsrfCookie(res);

  res.status(204).send();
});

export const csrf = asyncHandler(async (_req, res) => {
  const csrfToken = issueCsrfToken(res);

  res.json({ data: { csrfToken } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ data: { user: req.user.toJSON() } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const passwordChanged = Boolean(req.body.password);
  const user = await authService.updateProfile(req.user.id, req.body);

  if (passwordChanged) {
    clearRefreshCookie(res);
    clearCsrfCookie(res);
  }

  res.json({
    data: {
      user: user.toJSON(),
      ...(passwordChanged ? { sessionInvalidated: true } : {}),
    },
  });
});
