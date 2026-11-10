import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { audit } from '../../utils/audit.js';
import { signToken } from '../../utils/jwt.js';
import { generateRefreshToken, hashToken } from '../../utils/tokens.js';
import { withTransaction } from '../../utils/transaction.js';
import { userRepository } from '../users/user.repository.js';
import { refreshTokenRepository } from './refresh-token.repository.js';

const CONCURRENT_REFRESH = Symbol('CONCURRENT_REFRESH');

function refreshExpiry() {
  return new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

async function createSession(user, { session } = {}) {
  const refreshToken = generateRefreshToken();

  await refreshTokenRepository.create(
    {
      user: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiry(),
    },
    { session },
  );

  return { accessToken: signToken(user), refreshToken };
}

export async function registerUser({ name, email, password, interests }) {
  const result = await withTransaction(async (session) => {
    const user = await userRepository.create(
      { name, email, password, interests, role: 'user' },
      { session },
    );
    const tokens = await createSession(user, { session });

    return { user, ...tokens };
  });

  audit({ action: 'auth.register', actorId: result.user.id });

  return result;
}

export async function loginUser({ email, password }) {
  const user = await userRepository.findByEmail(email, { withPassword: true });

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password', undefined, 'INVALID_CREDENTIALS');
  }

  const result = { user, ...(await createSession(user)) };

  audit({ action: 'auth.login', actorId: user.id });

  return result;
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
      audit({ action: 'auth.refresh.reuse', actorId: stored.user.id });
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

  let result;

  try {
    result = await withTransaction(async (session) => {
      const revoked = await refreshTokenRepository.revokeByHash(tokenHash, {
        session,
        replacedByHash: nextHash,
      });

      if (!revoked) {
        throw CONCURRENT_REFRESH;
      }

      await refreshTokenRepository.create(
        {
          user: stored.user._id,
          tokenHash: nextHash,
          expiresAt: refreshExpiry(),
        },
        { session },
      );

      return {
        user: stored.user,
        accessToken: signToken(stored.user),
        refreshToken,
      };
    });
  } catch (error) {
    if (error === CONCURRENT_REFRESH) {
      await refreshTokenRepository.revokeAllForUser(stored.user._id);
      audit({ action: 'auth.refresh.reuse', actorId: stored.user.id });
      throw new ApiError(401, 'Refresh token reuse detected', undefined, 'REFRESH_TOKEN_REUSED');
    }

    throw error;
  }

  audit({ action: 'auth.refresh', actorId: stored.user.id });

  return result;
}

export async function logout(rawToken) {
  if (!rawToken) {
    return;
  }

  const revoked = await refreshTokenRepository.revokeByHash(hashToken(rawToken));

  if (revoked) {
    audit({ action: 'auth.logout', actorId: revoked.user.toString() });
  }
}

export async function revokeAllForUser(userId) {
  await refreshTokenRepository.revokeAllForUser(userId);
}

export async function updateProfile(userId, updates) {
  const passwordChanged = Boolean(updates.password);

  const user = await withTransaction(async (session) => {
    const existing = await userRepository.findById(userId, { session });

    if (!existing) {
      throw new ApiError(404, 'User not found');
    }

    Object.assign(existing, updates);
    await userRepository.save(existing, { session });

    if (passwordChanged) {
      await refreshTokenRepository.revokeAllForUser(existing._id, { session });
    }

    return existing;
  });

  audit({
    action: 'auth.profile.update',
    actorId: userId,
    changedFields: Object.keys(updates),
  });

  return user;
}
