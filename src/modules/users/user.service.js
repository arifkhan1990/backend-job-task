import { noteRepository } from '../notes/note.repository.js';
import { postRepository } from '../posts/post.repository.js';
import { refreshTokenRepository } from '../auth/refresh-token.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, paginationMeta } from '../../utils/pagination.js';
import { userRepository } from './user.repository.js';

export async function listUsers({ page, limit }) {
  const { skip } = getPagination({ page, limit });

  const [users, total] = await Promise.all([
    userRepository.list({ skip, limit }),
    userRepository.count(),
  ]);

  return { users, meta: paginationMeta({ page, limit, total }) };
}

export async function createUser(data) {
  return userRepository.create(data);
}

export async function getUserById(id) {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function updateUser(id, updates, actorId) {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (updates.role && updates.role !== user.role) {
    if (user.id === actorId) {
      throw new ApiError(400, 'You cannot change your own role', undefined, 'SELF_ROLE_CHANGE');
    }

    if (user.role === 'admin') {
      const adminCount = await userRepository.countAdmins();

      if (adminCount <= 1) {
        throw new ApiError(400, 'Cannot demote the last admin', undefined, 'LAST_ADMIN');
      }
    }
  }

  const roleChanged = Boolean(updates.role && updates.role !== user.role);

  Object.assign(user, updates);
  await userRepository.save(user);

  if (updates.password || roleChanged) {
    await refreshTokenRepository.revokeAllForUser(user._id);
  }

  return user;
}

export async function deleteUser(id, actorId) {
  if (id === actorId) {
    throw new ApiError(400, 'You cannot delete your own account', undefined, 'SELF_DELETE');
  }

  const user = await userRepository.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === 'admin') {
    const adminCount = await userRepository.countAdmins();

    if (adminCount <= 1) {
      throw new ApiError(400, 'Cannot delete the last admin', undefined, 'LAST_ADMIN');
    }
  }

  await userRepository.deleteById(id);
  await Promise.all([
    noteRepository.deleteByOwner(user._id),
    postRepository.deleteByAuthor(user._id),
    refreshTokenRepository.deleteByUser(user._id),
  ]);

  return user;
}

export async function groupUsersByInterests({ page, limit, interest }) {
  const { skip } = getPagination({ page, limit });

  // This is the single aggregate() call for the interests view. Pagination and
  // the total count are produced inside the same pipeline with $facet.
  const [result] = await userRepository.groupByInterests({ skip, limit, interest });

  return {
    groups: result?.data ?? [],
    meta: paginationMeta({
      page,
      limit,
      total: result?.meta?.[0]?.total ?? 0,
    }),
  };
}

export async function getUserPosts(userId, { page, limit }) {
  const { skip } = getPagination({ page, limit });

  // One aggregate() with one $lookup. The lookup uses posts.author and the
  // compound index supports the inner sort.
  const [result] = await userRepository.findPostsByUser(userId, { skip, limit });

  if (!result) {
    throw new ApiError(404, 'User not found');
  }

  return {
    user: { _id: result._id, name: result.name },
    posts: result.posts,
    meta: paginationMeta({ page, limit, total: result.totalPosts }),
  };
}
