import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/jwt.js';
import { generateRefreshToken, hashToken } from '../../utils/tokens.js';
import { userRepository } from '../users/user.repository.js';
import { refreshTokenRepository } from './refresh-token.repository.js';

function refreshExpiry() {
  return new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

async function createSession(user) {
  const refreshToken = generateRefreshToken();

  await refreshTokenRepository.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiry(),
  });

  return { accessToken: signToken(user), refreshToken };
}

export async function registerUser({ name, email, password, interests }) {
  const user = await userRepository.create({
    name,
    email,
    password,
    interests,
    role: 'user',
  });

  return { user, ...(await createSession(user)) };
}

export async function loginUser({ email, password }) {
  const user = await userRepository.findByEmail(email, { withPassword: true });

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password', undefined, 'INVALID_CREDENTIALS');
  }

  return { user, ...(await createSession(user)) };
}

export async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const stored = await refreshTokenRepository.findByHash(tokenHash);

  if (!stored) {
    throw new ApiError(401, 'Invalid refresh token', undefined, 'INVALID_REFRESH_TOKEN');
  }

  if (stored.revokedAt) {
    if (stored.user) {
      await refreshTokenRepository.revokeAllForUser(stored.user._id);
    }

    throw new ApiError(401, 'Refresh token reuse detected', undefined, 'REFRESH_TOKEN_REUSED');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    await refreshTokenRepository.deleteByHash(tokenHash);
    throw new ApiError(401, 'Refresh token expired', undefined, 'REFRESH_TOKEN_EXPIRED');
  }

  if (!stored.user) {
    await refreshTokenRepository.deleteByHash(tokenHash);
    throw new ApiError(401, 'Account no longer exists', undefined, 'ACCOUNT_DELETED');
  }

  const refreshToken = generateRefreshToken();
  const nextHash = hashToken(refreshToken);
  const revoked = await refreshTokenRepository.revokeByHash(tokenHash, {
    replacedByHash: nextHash,
  });

  if (!revoked) {
    await refreshTokenRepository.revokeAllForUser(stored.user._id);
    throw new ApiError(401, 'Refresh token reuse detected', undefined, 'REFRESH_TOKEN_REUSED');
  }

  await refreshTokenRepository.create({
    user: stored.user._id,
    tokenHash: nextHash,
    expiresAt: refreshExpiry(),
  });

  return {
    user: stored.user,
    accessToken: signToken(stored.user),
    refreshToken,
  };
}

export async function logout(rawToken) {
  if (!rawToken) {
    return;
  }

  await refreshTokenRepository.revokeByHash(hashToken(rawToken));
}

export async function revokeAllForUser(userId) {
  await refreshTokenRepository.revokeAllForUser(userId);
}

export async function updateProfile(userId, updates) {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  Object.assign(user, updates);
  await userRepository.save(user);

  if (updates.password) {
    await revokeAllForUser(user._id);
  }

  return user;
}
