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

import {
  loginUser,
  registerUser,
  updateProfile,
} from '../../src/modules/auth/auth.service.js';
import { userRepository } from '../../src/modules/users/user.repository.js';

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
  });

  it('rejects wrong credentials with a generic error', async () => {
    const user = makeUser();
    user.comparePassword.mockResolvedValue(false);
    userRepository.findByEmail.mockResolvedValue(user);

    await expect(
      loginUser({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('returns a JWT on successful login', async () => {
    const user = makeUser();
    userRepository.findByEmail.mockResolvedValue(user);

    const result = await loginUser({
      email: 'user@example.com',
      password: 'Password123!',
    });

    expect(result.user).toBe(user);
    expect(result.token).toBeTypeOf('string');
  });

  it('creates a user and JWT on registration', async () => {
    const user = makeUser();
    userRepository.create.mockResolvedValue(user);

    const result = await registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Password123!',
      interests: ['chess'],
    });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user' }),
    );
    expect(result.user).toBe(user);
    expect(result.token).toBeTypeOf('string');
  });

  it('saves profile changes', async () => {
    const user = makeUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);

    const result = await updateProfile(user._id.toString(), { name: 'Updated' });

    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('Updated');
  });
});
