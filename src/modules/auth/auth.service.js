import { userRepository } from '../users/user.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/jwt.js';

export async function registerUser({ name, email, password, interests }) {
  const user = await userRepository.create({
    name,
    email,
    password,
    interests,
    role: 'user',
  });

  return { user, token: signToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await userRepository.findByEmail(email, { withPassword: true });

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password', undefined, 'INVALID_CREDENTIALS');
  }

  return { user, token: signToken(user) };
}

export async function updateProfile(userId, updates) {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  Object.assign(user, updates);
  await userRepository.save(user);

  return user;
}
