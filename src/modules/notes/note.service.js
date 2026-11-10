import { Note } from '../../models/Note.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, paginationMeta } from '../../utils/pagination.js';

export async function createNote(ownerId, data) {
  return Note.create({ ...data, owner: ownerId });
}

export async function listNotes({ user, page, limit, ownerId }) {
  const filter =
    user.role === 'admin'
      ? ownerId
        ? { owner: ownerId }
        : {}
      : { owner: user.id };

  const { skip } = getPagination({ page, limit });

  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email')
      .lean(),
    Note.countDocuments(filter),
  ]);

  return { notes, meta: paginationMeta({ page, limit, total }) };
}

export async function getNote(id, user) {
  const filter = user.role === 'admin' ? { _id: id } : { _id: id, owner: user.id };
  const note = await Note.findOne(filter).populate('owner', 'name email').lean();

  if (!note) {
    throw new ApiError(404, 'Note not found');
  }

  return note;
}

export async function updateNote(id, ownerId, updates) {
  const note = await Note.findOneAndUpdate({ _id: id, owner: ownerId }, updates, {
    new: true,
    runValidators: true,
  })
    .populate('owner', 'name email')
    .lean();

  if (!note) {
    throw new ApiError(404, 'Note not found');
  }

  return note;
}

export async function deleteNote(id, ownerId) {
  const note = await Note.findOneAndDelete({ _id: id, owner: ownerId }).lean();

  if (!note) {
    throw new ApiError(404, 'Note not found');
  }

  return note;
}
