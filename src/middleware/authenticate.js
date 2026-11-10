import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/jwt.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Authentication required');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  // Look the account up on every request so deleted users and role changes
  // take effect immediately instead of waiting for the token to expire.
  const user = await User.findById(payload.sub).select('name email role interests');

  if (!user) {
    throw new ApiError(401, 'Account no longer exists');
  }

  req.user = user;
  next();
});
