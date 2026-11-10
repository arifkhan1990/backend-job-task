import { noteRepository } from '../notes/note.repository.js';
import { postRepository } from '../posts/post.repository.js';
import { refreshTokenRepository } from '../auth/refresh-token.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { audit } from '../../utils/audit.js';
import { getPagination, paginationMeta } from '../../utils/pagination.js';
import { withTransaction } from '../../utils/transaction.js';
import { userRepository } from './user.repository.js';

export async function listUsers({ page, limit }) {
  const { skip } = getPagination({ page, limit });

  const [users, total] = await Promise.all([
    userRepository.list({ skip, limit }),
    userRepository.count(),
  ]);

  return { users, meta: paginationMeta({ page, limit, total }) };
}

export async function createUser(data, actorId) {
  const user = await userRepository.create(data);

  audit({
    action: 'user.create',
    actorId,
    targetId: user.id,
    role: user.role,
  });

  return user;
}

export async function getUserById(id) {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function updateUser(id, updates, actorId) {
  const user = await withTransaction(async (session) => {
    const existing = await userRepository.findById(id, { session });

    if (!existing) {
      throw new ApiError(404, 'User not found');
    }

    const roleChanged = Boolean(updates.role && updates.role !== existing.role);

    if (roleChanged) {
      if (existing.id === actorId) {
        throw new ApiError(400, 'You cannot change your own role', undefined, 'SELF_ROLE_CHANGE');
      }

      if (existing.role === 'admin') {
        const adminCount = await userRepository.countAdmins({ session });

        if (adminCount <= 1) {
          throw new ApiError(400, 'Cannot demote the last admin', undefined, 'LAST_ADMIN');
        }
      }
    }

    Object.assign(existing, updates);
    await userRepository.save(existing, { session });

    if (updates.password || roleChanged) {
      await refreshTokenRepository.revokeAllForUser(existing._id, { session });
    }

    return existing;
  });

  audit({
    action: 'user.update',
    actorId,
    targetId: user.id,
    changedFields: Object.keys(updates),
  });

  return user;
}

export async function deleteUser(id, actorId) {
  if (id === actorId) {
    throw new ApiError(400, 'You cannot delete your own account', undefined, 'SELF_DELETE');
  }

  const user = await withTransaction(async (session) => {
    const existing = await userRepository.findById(id, { session });

    if (!existing) {
      throw new ApiError(404, 'User not found');
    }

    if (existing.role === 'admin') {
      const adminCount = await userRepository.countAdmins({ session });

      if (adminCount <= 1) {
        throw new ApiError(400, 'Cannot delete the last admin', undefined, 'LAST_ADMIN');
      }
    }

    await userRepository.deleteById(id, { session });
    await noteRepository.deleteByOwner(existing._id, { session });
    await postRepository.deleteByAuthor(existing._id, { session });
    await refreshTokenRepository.deleteByUser(existing._id, { session });

    return existing;
  });

  audit({
    action: 'user.delete',
    actorId,
    targetId: user.id,
    role: user.role,
  });

  return user;
}

export async function bulkDeleteUsers(ids, actorId) {
  if (ids.includes(actorId)) {
    throw new ApiError(400, 'You cannot delete your own account', undefined, 'SELF_DELETE');
  }

  const deleted = await withTransaction(async (session) => {
    const users = await userRepository.findByIds(ids, { session });

    if (users.length !== ids.length) {
      throw new ApiError(404, 'One or more users not found');
    }

    if (users.some((user) => user.role === 'admin')) {
      const remainingAdmins = await userRepository.countAdminsExcluding(ids, { session });

      if (remainingAdmins < 1) {
        throw new ApiError(400, 'Cannot delete the last admin', undefined, 'LAST_ADMIN');
      }
    }

    const userIds = users.map((user) => user._id);

    await userRepository.deleteManyByIds(userIds, { session });
    await noteRepository.deleteByOwners(userIds, { session });
    await postRepository.deleteByAuthors(userIds, { session });
    await refreshTokenRepository.deleteByUsers(userIds, { session });

    return users.length;
  });

  audit({
    action: 'user.bulk_delete',
    actorId,
    count: deleted,
  });

  return deleted;
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
