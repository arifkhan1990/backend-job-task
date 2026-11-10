import mongoose from 'mongoose';
import { Note } from '../../models/Note.js';
import { Post } from '../../models/Post.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, paginationMeta } from '../../utils/pagination.js';

export async function listUsers({ page, limit }) {
  const { skip } = getPagination({ page, limit });

  const [users, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);

  return { users, meta: paginationMeta({ page, limit, total }) };
}

export async function createUser(data) {
  return User.create(data);
}

export async function getUserById(id) {
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function updateUser(id, updates, actorId) {
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (updates.role && updates.role !== user.role) {
    if (user.id === actorId) {
      throw new ApiError(400, 'You cannot change your own role');
    }

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });

      if (adminCount <= 1) {
        throw new ApiError(400, 'Cannot demote the last admin');
      }
    }
  }

  Object.assign(user, updates);
  await user.save();

  return user;
}

export async function deleteUser(id, actorId) {
  if (id === actorId) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });

    if (adminCount <= 1) {
      throw new ApiError(400, 'Cannot delete the last admin');
    }
  }

  await user.deleteOne();

  // Keep the database consistent after removing an account. MongoDB transactions
  // require a replica set, so these deletes are intentionally sequential and simple.
  await Promise.all([
    Note.deleteMany({ owner: user._id }),
    Post.deleteMany({ author: user._id }),
  ]);

  return user;
}

export async function groupUsersByInterests({ page, limit, interest }) {
  const { skip } = getPagination({ page, limit });
  const pipeline = [];

  if (interest) {
    pipeline.push({ $match: { interests: interest } });
  }

  pipeline.push(
    { $unwind: '$interests' },
    {
      $group: {
        _id: '$interests',
        userCount: { $sum: 1 },
        users: { $push: { _id: '$_id', name: '$name' } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        interest: '$_id',
        userCount: 1,
        users: 1,
      },
    },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: 'total' }],
      },
    },
  );

  // This is the single aggregate() call for the interests view. Pagination and
  // the total count are produced inside the same pipeline with $facet.
  const [result] = await User.aggregate(pipeline);

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
  // compound index supports the inner sort. $facet keeps the lookup output
  // limited to the requested page plus the total count.
  const [result] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        pipeline: [
          { $sort: { createdAt: -1, _id: -1 } },
          {
            $facet: {
              data: [{ $skip: skip }, { $limit: limit }],
              meta: [{ $count: 'total' }],
            },
          },
        ],
        as: 'postPage',
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        page: { $arrayElemAt: ['$postPage', 0] },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        posts: { $ifNull: ['$page.data', []] },
        totalPosts: { $ifNull: [{ $arrayElemAt: ['$page.meta.total', 0] }, 0] },
      },
    },
  ]);

  if (!result) {
    throw new ApiError(404, 'User not found');
  }

  return {
    user: { _id: result._id, name: result.name },
    posts: result.posts,
    meta: paginationMeta({ page, limit, total: result.totalPosts }),
  };
}
