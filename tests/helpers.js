import { randomUUID } from 'node:crypto';
import { User } from '../src/models/User.js';
import { signToken } from '../src/utils/jwt.js';

export async function createUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `user-${randomUUID()}@example.com`,
    password: 'Password123!',
    role: 'user',
    interests: [],
    ...overrides,
  });
}

export async function createAdmin(overrides = {}) {
  return createUser({ role: 'admin', ...overrides });
}

export function authHeader(user) {
  return `Bearer ${signToken(user)}`;
}
