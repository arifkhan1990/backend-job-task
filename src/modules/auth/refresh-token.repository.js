import { RefreshToken } from '../../models/RefreshToken.js';

export const refreshTokenRepository = {
  async create(data, { session } = {}) {
    if (session) {
      const [token] = await RefreshToken.create([data], { session });
      return token;
    }

    return RefreshToken.create(data);
  },

  findByHash(tokenHash, { session } = {}) {
    const query = RefreshToken.findOne({ tokenHash }).populate(
      'user',
      'name email role interests',
    );

    return session ? query.session(session) : query;
  },

  revokeByHash(tokenHash, { session, replacedByHash } = {}) {
    const update = { revokedAt: new Date() };

    if (replacedByHash) {
      update.replacedByHash = replacedByHash;
    }

    return RefreshToken.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      update,
      { new: true, ...(session ? { session } : {}) },
    );
  },

  revokeAllForUser(userId, { session } = {}) {
    const filter = { user: userId, revokedAt: null };
    const update = { revokedAt: new Date() };

    return session
      ? RefreshToken.updateMany(filter, update, { session })
      : RefreshToken.updateMany(filter, update);
  },

  deleteByUser(userId, { session } = {}) {
    const filter = { user: userId };

    return session
      ? RefreshToken.deleteMany(filter, { session })
      : RefreshToken.deleteMany(filter);
  },

  deleteByHash(tokenHash) {
    return RefreshToken.deleteOne({ tokenHash });
  },
};
