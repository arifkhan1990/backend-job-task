import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/users/user.repository.js', () => ({
  userRepository: {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock('../../src/modules/auth/refresh-token.repository.js', () => ({
  refreshTokenRepository: {
    create: vi.fn(),
    findByHash: vi.fn(),
    revokeByHash: vi.fn(),
    revokeAllForUser: vi.fn(),
    deleteByHash: vi.fn(),
    deleteByUser: vi.fn(),
  },
}));

vi.mock('../../src/utils/transaction.js', () => ({
  withTransaction: vi.fn((work) => work({})),
}));

import { refreshTokenRepository } from '../../src/modules/auth/refresh-token.repository.js';
import {
  loginUser,
  rotateRefreshToken,
  updateProfile,
} from '../../src/modules/auth/auth.service.js';
import { userRepository } from '../../src/modules/users/user.repository.js';
import { withTransaction } from '../../src/utils/transaction.js';

function makeUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    role: 'user',
    comparePassword: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTransaction.mockImplementation((work) => work({}));
  });

  it('rejects wrong credentials without revealing which part failed', async () => {
    const user = makeUser();
    user.comparePassword.mockResolvedValue(false);
    userRepository.findByEmail.mockResolvedValue(user);

    await expect(
      loginUser({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });

    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
  });

  it('creates a refresh session on successful login', async () => {
    const user = makeUser();
    userRepository.findByEmail.mockResolvedValue(user);

    const result = await loginUser({
      email: 'user@example.com',
      password: 'Password123!',
    });

    expect(result.user).toBe(user);
    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
  });

  it('revokes every session when a revoked refresh token is reused', async () => {
    const user = makeUser();
    refreshTokenRepository.findByHash.mockResolvedValue({
      revokedAt: new Date(),
      user,
    });

    await expect(rotateRefreshToken('reused-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REUSED',
    });

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(user._id);
  });

  it('rotates a valid refresh token', async () => {
    const user = makeUser();
    refreshTokenRepository.findByHash.mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    refreshTokenRepository.revokeByHash.mockResolvedValue({ _id: 'revoked' });

    const result = await rotateRefreshToken('current-token');

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(result.refreshToken).not.toBe('current-token');
    expect(refreshTokenRepository.revokeByHash).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ replacedByHash: expect.any(String) }),
    );
    expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
  });

  it('detects a concurrent refresh race and revokes the account sessions', async () => {
    const user = makeUser();
    refreshTokenRepository.findByHash.mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    refreshTokenRepository.revokeByHash.mockResolvedValue(null);

    await expect(rotateRefreshToken('racing-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REUSED',
    });

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(user._id);
  });

  it('revokes refresh tokens when the profile password changes', async () => {
    const user = makeUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);

    await updateProfile(user._id.toString(), { password: 'NewPassword123!' });

    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      user._id,
      expect.objectContaining({ session: expect.anything() }),
    );
  });
});
