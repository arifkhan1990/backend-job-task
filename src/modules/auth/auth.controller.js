import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.registerUser(req.body);

  res.status(201).json({
    data: { user: user.toJSON(), token },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);

  res.json({
    data: { user: user.toJSON(), token },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ data: { user: req.user.toJSON() } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);

  res.json({ data: { user: user.toJSON() } });
});
