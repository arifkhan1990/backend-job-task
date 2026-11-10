import mongoose from 'mongoose';
import { User } from '../../models/User.js';

export const userRepository = {
  async create(data, { session } = {}) {
    if (session) {
      const [user] = await User.create([data], { session });
      return user;
    }

    return User.create(data);
  },

  findByEmail(email, { withPassword = false } = {}) {
    const query = User.findOne({ email });
    return withPassword ? query.select('+password') : query;
  },

  findById(id) {
    return User.findById(id);
  },

  findByIdLean(id) {
    return User.findById(id).lean();
  },

  findByIds(ids) {
    return User.find({ _id: { $in: ids } });
  },

  list({ skip, limit }) {
    return User.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  count() {
    return User.countDocuments();
  },

  countAdmins() {
    return User.countDocuments({ role: 'admin' });
  },

  countAdminsExcluding(ids) {
    return User.countDocuments({ role: 'admin', _id: { $nin: ids } });
  },

  save(user, { session } = {}) {
    return user.save({ session });
  },

  deleteById(id, { session } = {}) {
    return session ? User.findByIdAndDelete(id, { session }) : User.findByIdAndDelete(id);
  },

  deleteManyByIds(ids, { session } = {}) {
    const filter = { _id: { $in: ids } };
    return session ? User.deleteMany(filter, { session }) : User.deleteMany(filter);
  },

  async groupByInterests({ skip, limit, interest }) {
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

    return User.aggregate(pipeline);
  },

  async findPostsByUser(userId, { skip, limit }) {
    return User.aggregate([
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
  },
};
