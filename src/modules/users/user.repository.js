import { User } from '../../models/User.js';
import { groupByInterestsPipeline, postsByUserPipeline } from './user.pipelines.js';

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

  findById(id, { session } = {}) {
    return session ? User.findById(id).session(session) : User.findById(id);
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

  countAdmins({ session } = {}) {
    const query = User.countDocuments({ role: 'admin' });
    return session ? query.session(session) : query;
  },

  countAdminsExcluding(ids, { session } = {}) {
    const query = User.countDocuments({ role: 'admin', _id: { $nin: ids } });
    return session ? query.session(session) : query;
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
    return User.aggregate(groupByInterestsPipeline({ skip, limit, interest }));
  },

  async findPostsByUser(userId, { skip, limit }) {
    return User.aggregate(postsByUserPipeline({ userId, skip, limit }));
  },
};
