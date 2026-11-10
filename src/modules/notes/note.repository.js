import { Note } from '../../models/Note.js';

export const noteRepository = {
  async create(data, { session } = {}) {
    if (session) {
      const [note] = await Note.create([data], { session });
      return note;
    }

    return Note.create(data);
  },

  findOne(filter) {
    return Note.findOne(filter).populate('owner', 'name email').lean();
  },

  list(filter, { skip, limit }) {
    return Note.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email')
      .lean();
  },

  count(filter) {
    return Note.countDocuments(filter);
  },

  updateOne(filter, updates) {
    return Note.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'name email')
      .lean();
  },

  deleteOne(filter) {
    return Note.findOneAndDelete(filter).lean();
  },

  deleteByOwner(ownerId, { session } = {}) {
    const filter = { owner: ownerId };
    return session ? Note.deleteMany(filter, { session }) : Note.deleteMany(filter);
  },

  deleteByOwners(ownerIds, { session } = {}) {
    const filter = { owner: { $in: ownerIds } };
    return session ? Note.deleteMany(filter, { session }) : Note.deleteMany(filter);
  },

  deleteManyByIds(ids, { session } = {}) {
    const filter = { _id: { $in: ids } };
    return session ? Note.deleteMany(filter, { session }) : Note.deleteMany(filter);
  },
};
