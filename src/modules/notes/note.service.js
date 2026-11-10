import { ApiError } from '../../utils/ApiError.js';
import { getPagination, paginationMeta } from '../../utils/pagination.js';
import { noteRepository } from './note.repository.js';

export async function createNote(ownerId, data) {
  return noteRepository.create({ ...data, owner: ownerId });
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
    noteRepository.list(filter, { skip, limit }),
    noteRepository.count(filter),
  ]);

  return { notes, meta: paginationMeta({ page, limit, total }) };
}

export async function getNote(id, user) {
  const filter = user.role === 'admin' ? { _id: id } : { _id: id, owner: user.id };
  const note = await noteRepository.findOne(filter);

  if (!note) {
    throw new ApiError(404, 'Note not found');
  }

  return note;
}

export async function updateNote(id, ownerId, updates) {
  const note = await noteRepository.updateOne({ _id: id, owner: ownerId }, updates);

  if (!note) {
    throw new ApiError(404, 'Note not found');
  }

  return note;
}

export async function deleteNote(id, ownerId) {
  const note = await noteRepository.deleteOne({ _id: id, owner: ownerId });

  if (!note) {
    throw new ApiError(404, 'Note not found');
  }

  return note;
}
