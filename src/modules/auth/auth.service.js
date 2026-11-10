import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/jwt.js';

export async function registerUser({ name, email, password, interests }) {
  const user = await User.create({
    name,
    email,
    password,
    interests,
    role: 'user',
  });

  return { user, token: signToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return { user, token: signToken(user) };
}

export async function updateProfile(userId, updates) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  Object.assign(user, updates);
  await user.save();

  return user;
}
